import { Col, InputNumber, Row, Typography } from 'antd';
import { renderFilterField } from '../shared/ui';
import { validateWarehouseSplitPieces, type WarehouseSplitPiece } from './warehouseSplitDraft';

const { Text } = Typography;

interface WarehouseSplitTicketFieldsProps {
  splitCount: number;
  pieces: WarehouseSplitPiece[];
  totalPieces: number;
  onSplitCountChange: (splitCount: number) => void;
  onPieceChange: (index: number, piece: WarehouseSplitPiece) => void;
}

export function WarehouseSplitTicketFields({
  splitCount,
  pieces,
  totalPieces,
  onSplitCountChange,
  onPieceChange
}: WarehouseSplitTicketFieldsProps) {
  const validationMessage = validateWarehouseSplitPieces(pieces, splitCount);
  const allocatedPieces = pieces.reduce<number>((sum, piece) => sum + Number(piece ?? 0), 0);
  const pieceCountChanged = allocatedPieces > 0 && allocatedPieces !== totalPieces;

  return (
    <>
      <div>
        <Text strong>拆分票数</Text>
        <InputNumber
          aria-label="拆分票数"
          min={2}
          precision={0}
          value={splitCount}
          onChange={(value) => {
            const requestedCount = Math.max(2, Math.floor(Number(value) || 2));
            onSplitCountChange(requestedCount);
          }}
          style={{ width: '100%' }}
        />
      </div>
      <Row gutter={[10, 10]}>
        {pieces.map((piece, index) => (
          <Col xs={24} sm={12} key={`split-ticket-${index + 1}`}>
            {renderFilterField(`第 ${index + 1} 票件数`, (
              <InputNumber
                aria-label={`第 ${index + 1} 票件数`}
                min={1}
                precision={0}
                value={piece}
                onChange={(value) => onPieceChange(index, value === null ? null : Number(value))}
                style={{ width: '100%' }}
              />
            ))}
          </Col>
        ))}
      </Row>
      <Text type={validationMessage ? 'danger' : pieceCountChanged ? 'warning' : 'secondary'}>
        {pieceCountChanged
          ? `拆后合计 ${allocatedPieces} 件，原记录 ${totalPieces} 件；确认后以拆后件数为准`
          : `已分配 ${allocatedPieces} / 原票 ${totalPieces} 件`}
      </Text>
    </>
  );
}
