import { Injectable } from '@nestjs/common';

export interface AiAssistRequest {
  module?: string;
  task?: string;
  scenario?: string;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface AiAssistResponse {
  provider: 'siliconflow';
  mode: 'live' | 'mock';
  model: string;
  content: string;
}

@Injectable()
export class AiService {
  private readonly baseUrl = process.env.SILICONFLOW_BASE_URL ?? 'https://api.siliconflow.cn/v1';
  private readonly model = process.env.SILICONFLOW_MODEL ?? 'Qwen/Qwen2.5-7B-Instruct';

  async assist(input: AiAssistRequest): Promise<AiAssistResponse> {
    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      return this.mockAssist(input);
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              '你是跨境物流 TMS/OMS 系统的 AI 运营助手。请用中文输出，聚焦风险、下一步动作、客户沟通话术，避免承诺真实物流操作。'
          },
          {
            role: 'user',
            content: `模块：${this.moduleName(input)}\n任务：${this.taskName(input)}\n上下文：${JSON.stringify(input.context ?? {})}\n需求：${input.prompt}`
          }
        ],
        temperature: 0.2,
        max_tokens: 700
      })
    });

    if (!response.ok) {
      return this.mockAssist(input, `硅基流动调用失败：${response.status}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return {
      provider: 'siliconflow',
      mode: 'live',
      model: this.model,
      content: data.choices?.[0]?.message?.content?.trim() || this.mockText(input)
    };
  }

  private mockAssist(input: AiAssistRequest, prefix = '未配置 SILICONFLOW_API_KEY，当前返回本地模拟建议'): AiAssistResponse {
    return {
      provider: 'siliconflow',
      mode: 'mock',
      model: this.model,
      content: `${prefix}。\n${this.mockText(input)}`
    };
  }

  private mockText(input: AiAssistRequest): string {
    return `【${this.moduleName(input)} · ${this.taskName(input)}】建议优先核对：${input.prompt}。下一步：1. 标记风险等级；2. 指派责任人；3. 生成客户可见说明；4. 写入审计记录。`;
  }

  private moduleName(input: AiAssistRequest): string {
    return input.module?.trim() || input.scenario?.trim() || 'AI 工作流';
  }

  private taskName(input: AiAssistRequest): string {
    return input.task?.trim() || input.scenario?.trim() || '辅助处理';
  }
}
