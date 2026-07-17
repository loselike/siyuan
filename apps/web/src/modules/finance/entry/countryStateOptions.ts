export interface LocationOption {
  value: string;
  label: string;
  searchText: string;
}

interface CountrySeed {
  zh: string;
  en: string;
  iso2: string;
  iso3: string;
  aliases?: string[];
}

interface StateSeed {
  value: string;
  label: string;
  aliases?: string[];
}

const countrySeeds: CountrySeed[] = [
  { zh: '中国', en: 'China', iso2: 'CN', iso3: 'CHN', aliases: ['PRC', 'Mainland China'] },
  { zh: '中国香港', en: 'Hong Kong', iso2: 'HK', iso3: 'HKG', aliases: ['香港', 'Hong Kong SAR'] },
  { zh: '中国澳门', en: 'Macau', iso2: 'MO', iso3: 'MAC', aliases: ['澳门', 'Macao'] },
  { zh: '中国台湾', en: 'Taiwan', iso2: 'TW', iso3: 'TWN', aliases: ['台湾'] },
  { zh: '美国', en: 'United States', iso2: 'US', iso3: 'USA', aliases: ['America', 'United States of America'] },
  { zh: '加拿大', en: 'Canada', iso2: 'CA', iso3: 'CAN' },
  { zh: '墨西哥', en: 'Mexico', iso2: 'MX', iso3: 'MEX' },
  { zh: '巴西', en: 'Brazil', iso2: 'BR', iso3: 'BRA' },
  { zh: '阿根廷', en: 'Argentina', iso2: 'AR', iso3: 'ARG' },
  { zh: '智利', en: 'Chile', iso2: 'CL', iso3: 'CHL' },
  { zh: '秘鲁', en: 'Peru', iso2: 'PE', iso3: 'PER' },
  { zh: '哥伦比亚', en: 'Colombia', iso2: 'CO', iso3: 'COL' },
  { zh: '英国', en: 'United Kingdom', iso2: 'GB', iso3: 'GBR', aliases: ['UK', 'Great Britain'] },
  { zh: '德国', en: 'Germany', iso2: 'DE', iso3: 'DEU' },
  { zh: '法国', en: 'France', iso2: 'FR', iso3: 'FRA' },
  { zh: '意大利', en: 'Italy', iso2: 'IT', iso3: 'ITA' },
  { zh: '西班牙', en: 'Spain', iso2: 'ES', iso3: 'ESP' },
  { zh: '葡萄牙', en: 'Portugal', iso2: 'PT', iso3: 'PRT' },
  { zh: '荷兰', en: 'Netherlands', iso2: 'NL', iso3: 'NLD', aliases: ['Holland'] },
  { zh: '比利时', en: 'Belgium', iso2: 'BE', iso3: 'BEL' },
  { zh: '卢森堡', en: 'Luxembourg', iso2: 'LU', iso3: 'LUX' },
  { zh: '瑞士', en: 'Switzerland', iso2: 'CH', iso3: 'CHE' },
  { zh: '奥地利', en: 'Austria', iso2: 'AT', iso3: 'AUT' },
  { zh: '爱尔兰', en: 'Ireland', iso2: 'IE', iso3: 'IRL' },
  { zh: '丹麦', en: 'Denmark', iso2: 'DK', iso3: 'DNK' },
  { zh: '瑞典', en: 'Sweden', iso2: 'SE', iso3: 'SWE' },
  { zh: '挪威', en: 'Norway', iso2: 'NO', iso3: 'NOR' },
  { zh: '芬兰', en: 'Finland', iso2: 'FI', iso3: 'FIN' },
  { zh: '波兰', en: 'Poland', iso2: 'PL', iso3: 'POL' },
  { zh: '捷克', en: 'Czechia', iso2: 'CZ', iso3: 'CZE', aliases: ['Czech Republic'] },
  { zh: '斯洛伐克', en: 'Slovakia', iso2: 'SK', iso3: 'SVK' },
  { zh: '匈牙利', en: 'Hungary', iso2: 'HU', iso3: 'HUN' },
  { zh: '罗马尼亚', en: 'Romania', iso2: 'RO', iso3: 'ROU' },
  { zh: '保加利亚', en: 'Bulgaria', iso2: 'BG', iso3: 'BGR' },
  { zh: '希腊', en: 'Greece', iso2: 'GR', iso3: 'GRC' },
  { zh: '土耳其', en: 'Turkey', iso2: 'TR', iso3: 'TUR', aliases: ['Türkiye'] },
  { zh: '俄罗斯', en: 'Russia', iso2: 'RU', iso3: 'RUS' },
  { zh: '乌克兰', en: 'Ukraine', iso2: 'UA', iso3: 'UKR' },
  { zh: '白俄罗斯', en: 'Belarus', iso2: 'BY', iso3: 'BLR' },
  { zh: '塞尔维亚', en: 'Serbia', iso2: 'RS', iso3: 'SRB' },
  { zh: '克罗地亚', en: 'Croatia', iso2: 'HR', iso3: 'HRV' },
  { zh: '斯洛文尼亚', en: 'Slovenia', iso2: 'SI', iso3: 'SVN' },
  { zh: '日本', en: 'Japan', iso2: 'JP', iso3: 'JPN' },
  { zh: '韩国', en: 'South Korea', iso2: 'KR', iso3: 'KOR', aliases: ['Korea', 'Republic of Korea'] },
  { zh: '新加坡', en: 'Singapore', iso2: 'SG', iso3: 'SGP' },
  { zh: '马来西亚', en: 'Malaysia', iso2: 'MY', iso3: 'MYS' },
  { zh: '泰国', en: 'Thailand', iso2: 'TH', iso3: 'THA' },
  { zh: '越南', en: 'Vietnam', iso2: 'VN', iso3: 'VNM' },
  { zh: '菲律宾', en: 'Philippines', iso2: 'PH', iso3: 'PHL' },
  { zh: '印度尼西亚', en: 'Indonesia', iso2: 'ID', iso3: 'IDN' },
  { zh: '印度', en: 'India', iso2: 'IN', iso3: 'IND' },
  { zh: '巴基斯坦', en: 'Pakistan', iso2: 'PK', iso3: 'PAK' },
  { zh: '孟加拉国', en: 'Bangladesh', iso2: 'BD', iso3: 'BGD' },
  { zh: '斯里兰卡', en: 'Sri Lanka', iso2: 'LK', iso3: 'LKA' },
  { zh: '阿联酋', en: 'United Arab Emirates', iso2: 'AE', iso3: 'ARE', aliases: ['UAE'] },
  { zh: '沙特阿拉伯', en: 'Saudi Arabia', iso2: 'SA', iso3: 'SAU', aliases: ['沙特'] },
  { zh: '卡塔尔', en: 'Qatar', iso2: 'QA', iso3: 'QAT' },
  { zh: '科威特', en: 'Kuwait', iso2: 'KW', iso3: 'KWT' },
  { zh: '以色列', en: 'Israel', iso2: 'IL', iso3: 'ISR' },
  { zh: '澳大利亚', en: 'Australia', iso2: 'AU', iso3: 'AUS' },
  { zh: '新西兰', en: 'New Zealand', iso2: 'NZ', iso3: 'NZL' },
  { zh: '南非', en: 'South Africa', iso2: 'ZA', iso3: 'ZAF' },
  { zh: '埃及', en: 'Egypt', iso2: 'EG', iso3: 'EGY' },
  { zh: '尼日利亚', en: 'Nigeria', iso2: 'NG', iso3: 'NGA' },
  { zh: '肯尼亚', en: 'Kenya', iso2: 'KE', iso3: 'KEN' },
  { zh: '摩洛哥', en: 'Morocco', iso2: 'MA', iso3: 'MAR' }
];

const isoCountryRows = 'AF AFG|AX ALA|AL ALB|DZ DZA|AS ASM|AD AND|AO AGO|AI AIA|AQ ATA|AG ATG|AR ARG|AM ARM|AW ABW|AU AUS|AT AUT|AZ AZE|BS BHS|BH BHR|BD BGD|BB BRB|BY BLR|BE BEL|BZ BLZ|BJ BEN|BM BMU|BT BTN|BO BOL|BQ BES|BA BIH|BW BWA|BV BVT|BR BRA|IO IOT|BN BRN|BG BGR|BF BFA|BI BDI|KH KHM|CM CMR|CA CAN|CV CPV|KY CYM|CF CAF|TD TCD|CL CHL|CN CHN|CX CXR|CC CCK|CO COL|KM COM|CG COG|CD COD|CK COK|CR CRI|CI CIV|HR HRV|CU CUB|CW CUW|CY CYP|CZ CZE|DK DNK|DJ DJI|DM DMA|DO DOM|EC ECU|EG EGY|SV SLV|GQ GNQ|ER ERI|EE EST|SZ SWZ|ET ETH|FK FLK|FO FRO|FJ FJI|FI FIN|FR FRA|GF GUF|PF PYF|TF ATF|GA GAB|GM GMB|GE GEO|DE DEU|GH GHA|GI GIB|GR GRC|GL GRL|GD GRD|GP GLP|GU GUM|GT GTM|GG GGY|GN GIN|GW GNB|GY GUY|HT HTI|HM HMD|VA VAT|HN HND|HK HKG|HU HUN|IS ISL|IN IND|ID IDN|IR IRN|IQ IRQ|IE IRL|IM IMN|IL ISR|IT ITA|JM JAM|JP JPN|JE JEY|JO JOR|KZ KAZ|KE KEN|KI KIR|KP PRK|KR KOR|KW KWT|KG KGZ|LA LAO|LV LVA|LB LBN|LS LSO|LR LBR|LY LBY|LI LIE|LT LTU|LU LUX|MO MAC|MG MDG|MW MWI|MY MYS|MV MDV|ML MLI|MT MLT|MH MHL|MQ MTQ|MR MRT|MU MUS|YT MYT|MX MEX|FM FSM|MD MDA|MC MCO|MN MNG|ME MNE|MS MSR|MA MAR|MZ MOZ|MM MMR|NA NAM|NR NRU|NP NPL|NL NLD|NC NCL|NZ NZL|NI NIC|NE NER|NG NGA|NU NIU|NF NFK|MK MKD|MP MNP|NO NOR|OM OMN|PK PAK|PW PLW|PS PSE|PA PAN|PG PNG|PY PRY|PE PER|PH PHL|PN PCN|PL POL|PT PRT|PR PRI|QA QAT|RE REU|RO ROU|RU RUS|RW RWA|BL BLM|SH SHN|KN KNA|LC LCA|MF MAF|PM SPM|VC VCT|WS WSM|SM SMR|ST STP|SA SAU|SN SEN|RS SRB|SC SYC|SL SLE|SG SGP|SX SXM|SK SVK|SI SVN|SB SLB|SO SOM|ZA ZAF|GS SGS|SS SSD|ES ESP|LK LKA|SD SDN|SR SUR|SJ SJM|SE SWE|CH CHE|SY SYR|TW TWN|TJ TJK|TZ TZA|TH THA|TL TLS|TG TGO|TK TKL|TO TON|TT TTO|TN TUN|TR TUR|TM TKM|TC TCA|TV TUV|UG UGA|UA UKR|AE ARE|GB GBR|US USA|UM UMI|UY URY|UZ UZB|VU VUT|VE VEN|VN VNM|VG VGB|VI VIR|WF WLF|EH ESH|YE YEM|ZM ZMB|ZW ZWE|XK XKX'
  .split('|')
  .map((item) => {
    const [iso2, iso3] = item.split(' ');
    return { iso2, iso3 };
  });

const stateSeedsByCountry: Record<string, StateSeed[]> = {
  CN: [
    { value: '北京', label: '北京 Beijing', aliases: ['BJ', 'Beijing'] },
    { value: '天津', label: '天津 Tianjin', aliases: ['TJ', 'Tianjin'] },
    { value: '河北', label: '河北 Hebei', aliases: ['HE', 'Hebei'] },
    { value: '山西', label: '山西 Shanxi', aliases: ['SX', 'Shanxi'] },
    { value: '内蒙古', label: '内蒙古 Inner Mongolia', aliases: ['NM', 'Inner Mongolia', 'Nei Mongol'] },
    { value: '辽宁', label: '辽宁 Liaoning', aliases: ['LN', 'Liaoning'] },
    { value: '吉林', label: '吉林 Jilin', aliases: ['JL', 'Jilin'] },
    { value: '黑龙江', label: '黑龙江 Heilongjiang', aliases: ['HL', 'Heilongjiang'] },
    { value: '上海', label: '上海 Shanghai', aliases: ['SH', 'Shanghai'] },
    { value: '江苏', label: '江苏 Jiangsu', aliases: ['JS', 'Jiangsu'] },
    { value: '浙江', label: '浙江 Zhejiang', aliases: ['ZJ', 'Zhejiang'] },
    { value: '安徽', label: '安徽 Anhui', aliases: ['AH', 'Anhui'] },
    { value: '福建', label: '福建 Fujian', aliases: ['FJ', 'Fujian'] },
    { value: '江西', label: '江西 Jiangxi', aliases: ['JX', 'Jiangxi'] },
    { value: '山东', label: '山东 Shandong', aliases: ['SD', 'Shandong'] },
    { value: '河南', label: '河南 Henan', aliases: ['HA', 'Henan'] },
    { value: '湖北', label: '湖北 Hubei', aliases: ['HB', 'Hubei'] },
    { value: '湖南', label: '湖南 Hunan', aliases: ['HN', 'Hunan'] },
    { value: '广东', label: '广东 Guangdong', aliases: ['GD', 'Guangdong'] },
    { value: '广西', label: '广西 Guangxi', aliases: ['GX', 'Guangxi'] },
    { value: '海南', label: '海南 Hainan', aliases: ['HI', 'Hainan'] },
    { value: '重庆', label: '重庆 Chongqing', aliases: ['CQ', 'Chongqing'] },
    { value: '四川', label: '四川 Sichuan', aliases: ['SC', 'Sichuan'] },
    { value: '贵州', label: '贵州 Guizhou', aliases: ['GZ', 'Guizhou'] },
    { value: '云南', label: '云南 Yunnan', aliases: ['YN', 'Yunnan'] },
    { value: '西藏', label: '西藏 Tibet', aliases: ['XZ', 'Tibet', 'Xizang'] },
    { value: '陕西', label: '陕西 Shaanxi', aliases: ['SN', 'Shaanxi'] },
    { value: '甘肃', label: '甘肃 Gansu', aliases: ['GS', 'Gansu'] },
    { value: '青海', label: '青海 Qinghai', aliases: ['QH', 'Qinghai'] },
    { value: '宁夏', label: '宁夏 Ningxia', aliases: ['NX', 'Ningxia'] },
    { value: '新疆', label: '新疆 Xinjiang', aliases: ['XJ', 'Xinjiang'] },
    { value: '香港', label: '香港 Hong Kong', aliases: ['HK', 'Hong Kong'] },
    { value: '澳门', label: '澳门 Macau', aliases: ['MO', 'Macau', 'Macao'] },
    { value: '台湾', label: '台湾 Taiwan', aliases: ['TW', 'Taiwan'] }
  ],
  US: [
    { value: 'CA', label: 'CA California 加利福尼亚州', aliases: ['California', '加州', '加利福尼亚'] },
    { value: 'AL', label: 'AL Alabama 阿拉巴马州', aliases: ['Alabama'] },
    { value: 'AK', label: 'AK Alaska 阿拉斯加州', aliases: ['Alaska'] },
    { value: 'AZ', label: 'AZ Arizona 亚利桑那州', aliases: ['Arizona'] },
    { value: 'AR', label: 'AR Arkansas 阿肯色州', aliases: ['Arkansas'] },
    { value: 'CO', label: 'CO Colorado 科罗拉多州', aliases: ['Colorado'] },
    { value: 'CT', label: 'CT Connecticut 康涅狄格州', aliases: ['Connecticut'] },
    { value: 'DE', label: 'DE Delaware 特拉华州', aliases: ['Delaware'] },
    { value: 'DC', label: 'DC District of Columbia 华盛顿哥伦比亚特区', aliases: ['District of Columbia', 'Washington DC', 'Washington D.C.'] },
    { value: 'FL', label: 'FL Florida 佛罗里达州', aliases: ['Florida', '佛州', '佛罗里达'] },
    { value: 'GA', label: 'GA Georgia 佐治亚州', aliases: ['Georgia', '佐治亚'] },
    { value: 'HI', label: 'HI Hawaii 夏威夷州', aliases: ['Hawaii'] },
    { value: 'ID', label: 'ID Idaho 爱达荷州', aliases: ['Idaho'] },
    { value: 'IL', label: 'IL Illinois 伊利诺伊州', aliases: ['Illinois', '伊利诺伊'] },
    { value: 'IN', label: 'IN Indiana 印第安纳州', aliases: ['Indiana'] },
    { value: 'IA', label: 'IA Iowa 爱荷华州', aliases: ['Iowa'] },
    { value: 'KS', label: 'KS Kansas 堪萨斯州', aliases: ['Kansas'] },
    { value: 'KY', label: 'KY Kentucky 肯塔基州', aliases: ['Kentucky'] },
    { value: 'LA', label: 'LA Louisiana 路易斯安那州', aliases: ['Louisiana'] },
    { value: 'ME', label: 'ME Maine 缅因州', aliases: ['Maine'] },
    { value: 'MD', label: 'MD Maryland 马里兰州', aliases: ['Maryland'] },
    { value: 'MA', label: 'MA Massachusetts 马萨诸塞州', aliases: ['Massachusetts'] },
    { value: 'MI', label: 'MI Michigan 密歇根州', aliases: ['Michigan'] },
    { value: 'MN', label: 'MN Minnesota 明尼苏达州', aliases: ['Minnesota'] },
    { value: 'MS', label: 'MS Mississippi 密西西比州', aliases: ['Mississippi'] },
    { value: 'MO', label: 'MO Missouri 密苏里州', aliases: ['Missouri'] },
    { value: 'MT', label: 'MT Montana 蒙大拿州', aliases: ['Montana'] },
    { value: 'NE', label: 'NE Nebraska 内布拉斯加州', aliases: ['Nebraska'] },
    { value: 'NV', label: 'NV Nevada 内华达州', aliases: ['Nevada'] },
    { value: 'NH', label: 'NH New Hampshire 新罕布什尔州', aliases: ['New Hampshire'] },
    { value: 'NJ', label: 'NJ New Jersey 新泽西州', aliases: ['New Jersey', '新泽西'] },
    { value: 'NM', label: 'NM New Mexico 新墨西哥州', aliases: ['New Mexico'] },
    { value: 'NY', label: 'NY New York 纽约州', aliases: ['New York', '纽约'] },
    { value: 'NC', label: 'NC North Carolina 北卡罗来纳州', aliases: ['North Carolina'] },
    { value: 'ND', label: 'ND North Dakota 北达科他州', aliases: ['North Dakota'] },
    { value: 'PA', label: 'PA Pennsylvania 宾夕法尼亚州', aliases: ['Pennsylvania', '宾州'] },
    { value: 'OH', label: 'OH Ohio 俄亥俄州', aliases: ['Ohio', '俄亥俄'] },
    { value: 'OK', label: 'OK Oklahoma 俄克拉荷马州', aliases: ['Oklahoma'] },
    { value: 'OR', label: 'OR Oregon 俄勒冈州', aliases: ['Oregon'] },
    { value: 'RI', label: 'RI Rhode Island 罗得岛州', aliases: ['Rhode Island'] },
    { value: 'SC', label: 'SC South Carolina 南卡罗来纳州', aliases: ['South Carolina'] },
    { value: 'SD', label: 'SD South Dakota 南达科他州', aliases: ['South Dakota'] },
    { value: 'TN', label: 'TN Tennessee 田纳西州', aliases: ['Tennessee'] },
    { value: 'TX', label: 'TX Texas 德克萨斯州', aliases: ['Texas', '德州', '德克萨斯'] },
    { value: 'UT', label: 'UT Utah 犹他州', aliases: ['Utah'] },
    { value: 'VT', label: 'VT Vermont 佛蒙特州', aliases: ['Vermont'] },
    { value: 'VA', label: 'VA Virginia 弗吉尼亚州', aliases: ['Virginia'] },
    { value: 'WA', label: 'WA Washington 华盛顿州', aliases: ['Washington', '华盛顿'] },
    { value: 'WV', label: 'WV West Virginia 西弗吉尼亚州', aliases: ['West Virginia'] },
    { value: 'WI', label: 'WI Wisconsin 威斯康星州', aliases: ['Wisconsin'] },
    { value: 'WY', label: 'WY Wyoming 怀俄明州', aliases: ['Wyoming'] }
  ],
  CA: [
    { value: 'ON', label: 'ON Ontario 安大略省', aliases: ['Ontario', '安大略'] },
    { value: 'BC', label: 'BC British Columbia 不列颠哥伦比亚省', aliases: ['British Columbia', 'B.C.', '卑诗省'] },
    { value: 'QC', label: 'QC Quebec 魁北克省', aliases: ['Quebec', 'Québec', '魁北克'] },
    { value: 'AB', label: 'AB Alberta 阿尔伯塔省', aliases: ['Alberta', '阿尔伯塔'] },
    { value: 'MB', label: 'MB Manitoba 曼尼托巴省', aliases: ['Manitoba', '曼尼托巴'] },
    { value: 'NB', label: 'NB New Brunswick 新不伦瑞克省', aliases: ['New Brunswick'] },
    { value: 'NL', label: 'NL Newfoundland and Labrador 纽芬兰与拉布拉多省', aliases: ['Newfoundland and Labrador'] },
    { value: 'NS', label: 'NS Nova Scotia 新斯科舍省', aliases: ['Nova Scotia'] },
    { value: 'NT', label: 'NT Northwest Territories 西北地区', aliases: ['Northwest Territories'] },
    { value: 'NU', label: 'NU Nunavut 努纳武特地区', aliases: ['Nunavut'] },
    { value: 'PE', label: 'PE Prince Edward Island 爱德华王子岛省', aliases: ['Prince Edward Island', 'PEI'] },
    { value: 'SK', label: 'SK Saskatchewan 萨斯喀彻温省', aliases: ['Saskatchewan'] },
    { value: 'YT', label: 'YT Yukon 育空地区', aliases: ['Yukon'] }
  ],
  MX: [
    { value: 'Aguascalientes', label: 'Aguascalientes 阿瓜斯卡连特斯', aliases: ['AGU'] },
    { value: 'Baja California', label: 'Baja California 下加利福尼亚', aliases: ['BCN'] },
    { value: 'Baja California Sur', label: 'Baja California Sur 南下加利福尼亚', aliases: ['BCS'] },
    { value: 'Campeche', label: 'Campeche 坎佩切', aliases: ['CAM'] },
    { value: 'Chiapas', label: 'Chiapas 恰帕斯', aliases: ['CHP'] },
    { value: 'Chihuahua', label: 'Chihuahua 奇瓦瓦', aliases: ['CHH'] },
    { value: 'Coahuila', label: 'Coahuila 科阿韦拉', aliases: ['COA'] },
    { value: 'Colima', label: 'Colima 科利马', aliases: ['COL'] },
    { value: 'CDMX', label: 'CDMX Mexico City 墨西哥城', aliases: ['Mexico City', 'Ciudad de México', 'Ciudad de Mexico'] },
    { value: 'Durango', label: 'Durango 杜兰戈', aliases: ['DUR'] },
    { value: 'Guanajuato', label: 'Guanajuato 瓜纳华托', aliases: ['GUA'] },
    { value: 'Guerrero', label: 'Guerrero 格雷罗', aliases: ['GRO'] },
    { value: 'Hidalgo', label: 'Hidalgo 伊达尔戈', aliases: ['HID'] },
    { value: 'Jalisco', label: 'Jalisco 哈利斯科', aliases: ['JAL'] },
    { value: 'Mexico State', label: 'Mexico State Estado de México 墨西哥州', aliases: ['Estado de México', 'Estado de Mexico', 'MEX'] },
    { value: 'Michoacan', label: 'Michoacan Michoacán 米却肯', aliases: ['Michoacán', 'MIC'] },
    { value: 'Morelos', label: 'Morelos 莫雷洛斯', aliases: ['MOR'] },
    { value: 'Nayarit', label: 'Nayarit 纳亚里特', aliases: ['NAY'] },
    { value: 'Nuevo Leon', label: 'Nuevo León Nuevo Leon 新莱昂', aliases: ['Nuevo León', 'NLE'] },
    { value: 'Oaxaca', label: 'Oaxaca 瓦哈卡', aliases: ['OAX'] },
    { value: 'Puebla', label: 'Puebla 普埃布拉', aliases: ['PUE'] },
    { value: 'Queretaro', label: 'Queretaro Querétaro 克雷塔罗', aliases: ['Querétaro', 'QUE'] },
    { value: 'Quintana Roo', label: 'Quintana Roo 金塔纳罗奥', aliases: ['ROO'] },
    { value: 'San Luis Potosi', label: 'San Luis Potosí San Luis Potosi 圣路易斯波托西', aliases: ['San Luis Potosí', 'SLP'] },
    { value: 'Sinaloa', label: 'Sinaloa 锡那罗亚', aliases: ['SIN'] },
    { value: 'Sonora', label: 'Sonora 索诺拉', aliases: ['SON'] },
    { value: 'Tabasco', label: 'Tabasco 塔巴斯科', aliases: ['TAB'] },
    { value: 'Tamaulipas', label: 'Tamaulipas 塔毛利帕斯', aliases: ['TAM'] },
    { value: 'Tlaxcala', label: 'Tlaxcala 特拉斯卡拉', aliases: ['TLA'] },
    { value: 'Veracruz', label: 'Veracruz 韦拉克鲁斯', aliases: ['VER'] },
    { value: 'Yucatan', label: 'Yucatan Yucatán 尤卡坦', aliases: ['Yucatán', 'YUC'] },
    { value: 'Zacatecas', label: 'Zacatecas 萨卡特卡斯', aliases: ['ZAC'] }
  ],
  AU: [
    { value: 'NSW', label: 'NSW New South Wales 新南威尔士州', aliases: ['New South Wales'] },
    { value: 'VIC', label: 'VIC Victoria 维多利亚州', aliases: ['Victoria'] },
    { value: 'QLD', label: 'QLD Queensland 昆士兰州', aliases: ['Queensland'] },
    { value: 'WA', label: 'WA Western Australia 西澳大利亚州', aliases: ['Western Australia'] },
    { value: 'SA', label: 'SA South Australia 南澳大利亚州', aliases: ['South Australia'] },
    { value: 'TAS', label: 'TAS Tasmania 塔斯马尼亚州', aliases: ['Tasmania'] },
    { value: 'ACT', label: 'ACT Australian Capital Territory 澳大利亚首都领地', aliases: ['Australian Capital Territory'] },
    { value: 'NT', label: 'NT Northern Territory 北领地', aliases: ['Northern Territory'] }
  ],
  GB: [
    { value: 'England', label: 'England 英格兰', aliases: ['英格兰'] },
    { value: 'Scotland', label: 'Scotland 苏格兰', aliases: ['苏格兰'] },
    { value: 'Wales', label: 'Wales 威尔士', aliases: ['威尔士'] },
    { value: 'Northern Ireland', label: 'Northern Ireland 北爱尔兰', aliases: ['北爱尔兰'] }
  ],
  DE: [
    { value: 'Bavaria', label: 'Bavaria Bayern 巴伐利亚', aliases: ['Bayern', '巴伐利亚'] },
    { value: 'North Rhine-Westphalia', label: 'North Rhine-Westphalia NRW 北莱茵-威斯特法伦', aliases: ['NRW'] },
    { value: 'Baden-Wurttemberg', label: 'Baden-Wurttemberg Baden-Württemberg 巴登-符腾堡', aliases: ['Baden-Württemberg', 'BW'] },
    { value: 'Berlin', label: 'Berlin 柏林', aliases: ['BE'] },
    { value: 'Brandenburg', label: 'Brandenburg 勃兰登堡', aliases: ['BB'] },
    { value: 'Bremen', label: 'Bremen 不来梅', aliases: ['HB'] },
    { value: 'Hamburg', label: 'Hamburg 汉堡', aliases: ['HH'] },
    { value: 'Hesse', label: 'Hesse Hessen 黑森', aliases: ['Hessen', 'HE'] },
    { value: 'Lower Saxony', label: 'Lower Saxony Niedersachsen 下萨克森', aliases: ['Niedersachsen', 'NI'] },
    { value: 'Mecklenburg-Vorpommern', label: 'Mecklenburg-Vorpommern 梅克伦堡-前波美拉尼亚', aliases: ['Mecklenburg-Western Pomerania', 'MV'] },
    { value: 'Rhineland-Palatinate', label: 'Rhineland-Palatinate Rheinland-Pfalz 莱茵兰-普法尔茨', aliases: ['Rheinland-Pfalz', 'RP'] },
    { value: 'Saarland', label: 'Saarland 萨尔', aliases: ['SL'] },
    { value: 'Saxony', label: 'Saxony Sachsen 萨克森', aliases: ['Sachsen', 'SN'] },
    { value: 'Saxony-Anhalt', label: 'Saxony-Anhalt Sachsen-Anhalt 萨克森-安哈尔特', aliases: ['Sachsen-Anhalt', 'ST'] },
    { value: 'Schleswig-Holstein', label: 'Schleswig-Holstein 石勒苏益格-荷尔斯泰因', aliases: ['SH'] },
    { value: 'Thuringia', label: 'Thuringia Thüringen 图林根', aliases: ['Thüringen', 'Thueringen', 'TH'] }
  ],
  ES: [
    { value: 'Andalusia', label: 'Andalusia Andalucía 安达卢西亚', aliases: ['Andalucía'] },
    { value: 'Aragon', label: 'Aragon Aragón 阿拉贡', aliases: ['Aragón'] },
    { value: 'Asturias', label: 'Asturias 阿斯图里亚斯', aliases: ['Principality of Asturias'] },
    { value: 'Balearic Islands', label: 'Balearic Islands Islas Baleares 巴利阿里群岛', aliases: ['Illes Balears', 'Islas Baleares'] },
    { value: 'Basque Country', label: 'Basque Country País Vasco 巴斯克', aliases: ['País Vasco', 'Pais Vasco', 'Euskadi'] },
    { value: 'Canary Islands', label: 'Canary Islands Canarias 加那利群岛', aliases: ['Canarias'] },
    { value: 'Cantabria', label: 'Cantabria 坎塔布里亚', aliases: [] },
    { value: 'Castile and Leon', label: 'Castile and León Castilla y León 卡斯蒂利亚-莱昂', aliases: ['Castile and León', 'Castilla y León', 'Castilla y Leon'] },
    { value: 'Castilla-La Mancha', label: 'Castilla-La Mancha 卡斯蒂利亚-拉曼恰', aliases: [] },
    { value: 'Catalonia', label: 'Catalonia Cataluña 加泰罗尼亚', aliases: ['Cataluña', 'Catalunya'] },
    { value: 'Extremadura', label: 'Extremadura 埃斯特雷马杜拉', aliases: [] },
    { value: 'Galicia', label: 'Galicia 加利西亚', aliases: ['Galiza'] },
    { value: 'La Rioja', label: 'La Rioja 拉里奥哈', aliases: [] },
    { value: 'Madrid', label: 'Madrid 马德里', aliases: ['Community of Madrid', 'Comunidad de Madrid'] },
    { value: 'Murcia', label: 'Murcia 穆尔西亚', aliases: ['Region of Murcia'] },
    { value: 'Navarre', label: 'Navarre Navarra 纳瓦拉', aliases: ['Navarra'] },
    { value: 'Valencian Community', label: 'Valencian Community Comunidad Valenciana 瓦伦西亚', aliases: ['Comunidad Valenciana', 'Valencia'] },
    { value: 'Ceuta', label: 'Ceuta 休达', aliases: [] },
    { value: 'Melilla', label: 'Melilla 梅利利亚', aliases: [] }
  ],
  FR: [
    { value: 'Auvergne-Rhone-Alpes', label: 'Auvergne-Rhône-Alpes Auvergne-Rhone-Alpes 奥弗涅-罗讷-阿尔卑斯', aliases: ['Auvergne-Rhône-Alpes'] },
    { value: 'Bourgogne-Franche-Comte', label: 'Bourgogne-Franche-Comté Bourgogne-Franche-Comte 勃艮第-弗朗什-孔泰', aliases: ['Bourgogne-Franche-Comté'] },
    { value: 'Brittany', label: 'Brittany Bretagne 布列塔尼', aliases: ['Bretagne'] },
    { value: 'Centre-Val de Loire', label: 'Centre-Val de Loire 中央-卢瓦尔河谷', aliases: [] },
    { value: 'Corsica', label: 'Corsica Corse 科西嘉', aliases: ['Corse'] },
    { value: 'Grand Est', label: 'Grand Est 大东部', aliases: [] },
    { value: 'Hauts-de-France', label: 'Hauts-de-France 上法兰西', aliases: [] },
    { value: 'Ile-de-France', label: 'Île-de-France Ile-de-France 法兰西岛', aliases: ['Île-de-France'] },
    { value: 'Normandy', label: 'Normandy Normandie 诺曼底', aliases: ['Normandie'] },
    { value: 'Nouvelle-Aquitaine', label: 'Nouvelle-Aquitaine 新阿基坦', aliases: [] },
    { value: 'Occitanie', label: 'Occitanie 奥克西塔尼', aliases: [] },
    { value: 'Pays de la Loire', label: 'Pays de la Loire 卢瓦尔河地区', aliases: [] },
    { value: 'Provence-Alpes-Cote d Azur', label: "Provence-Alpes-Côte d'Azur Provence-Alpes-Cote d Azur 普罗旺斯-阿尔卑斯-蓝色海岸", aliases: ["Provence-Alpes-Côte d'Azur", 'PACA'] },
    { value: 'Guadeloupe', label: 'Guadeloupe 瓜德罗普', aliases: [] },
    { value: 'Martinique', label: 'Martinique 马提尼克', aliases: [] },
    { value: 'French Guiana', label: 'French Guiana Guyane 法属圭亚那', aliases: ['Guyane'] },
    { value: 'Reunion', label: 'Réunion Reunion 留尼汪', aliases: ['Réunion'] },
    { value: 'Mayotte', label: 'Mayotte 马约特', aliases: [] }
  ],
  AT: [
    { value: 'Burgenland', label: 'Burgenland 布尔根兰', aliases: [] },
    { value: 'Carinthia', label: 'Carinthia Kärnten 克恩顿', aliases: ['Kärnten', 'Kaernten'] },
    { value: 'Lower Austria', label: 'Lower Austria Niederösterreich 下奥地利', aliases: ['Niederösterreich', 'Niederoesterreich'] },
    { value: 'Upper Austria', label: 'Upper Austria Oberösterreich 上奥地利', aliases: ['Oberösterreich', 'Oberoesterreich'] },
    { value: 'Salzburg', label: 'Salzburg 萨尔茨堡', aliases: [] },
    { value: 'Styria', label: 'Styria Steiermark 施蒂利亚', aliases: ['Steiermark'] },
    { value: 'Tyrol', label: 'Tyrol Tirol 蒂罗尔', aliases: ['Tirol'] },
    { value: 'Vorarlberg', label: 'Vorarlberg 福拉尔贝格', aliases: [] },
    { value: 'Vienna', label: 'Vienna Wien 维也纳', aliases: ['Wien'] }
  ],
  SA: [
    { value: 'Riyadh', label: 'Riyadh 利雅得', aliases: ['Ar Riyad'] },
    { value: 'Makkah', label: 'Makkah 麦加', aliases: ['Mecca', 'Makkah Al Mukarramah'] },
    { value: 'Madinah', label: 'Madinah 麦地那', aliases: ['Medina', 'Al Madinah'] },
    { value: 'Eastern Province', label: 'Eastern Province 东部省', aliases: ['Ash Sharqiyah', 'Eastern'] },
    { value: 'Qassim', label: 'Qassim 卡西姆', aliases: ['Al Qassim'] },
    { value: 'Hail', label: 'Hail 哈伊勒', aliases: ["Ha'il", 'Hail'] },
    { value: 'Tabuk', label: 'Tabuk 塔布克', aliases: [] },
    { value: 'Northern Borders', label: 'Northern Borders 北部边疆', aliases: ['Al Hudud ash Shamaliyah'] },
    { value: 'Jazan', label: 'Jazan 吉赞', aliases: ['Jizan'] },
    { value: 'Najran', label: 'Najran 纳季兰', aliases: [] },
    { value: 'Bahah', label: 'Bahah 巴哈', aliases: ['Al Bahah'] },
    { value: 'Jawf', label: 'Jawf 焦夫', aliases: ['Al Jawf'] },
    { value: 'Asir', label: 'Asir 阿西尔', aliases: ['Aseer'] }
  ],
  OM: [
    { value: 'Muscat', label: 'Muscat 马斯喀特', aliases: ['Masqat'] },
    { value: 'Dhofar', label: 'Dhofar 佐法尔', aliases: ['Zufar'] },
    { value: 'Musandam', label: 'Musandam 穆桑代姆', aliases: [] },
    { value: 'Al Buraimi', label: 'Al Buraimi 布赖米', aliases: ['Buraimi'] },
    { value: 'Ad Dakhiliyah', label: 'Ad Dakhiliyah 内地省', aliases: ['Dakhiliyah'] },
    { value: 'Al Batinah North', label: 'Al Batinah North 北巴提奈', aliases: ['North Batinah'] },
    { value: 'Al Batinah South', label: 'Al Batinah South 南巴提奈', aliases: ['South Batinah'] },
    { value: 'Ash Sharqiyah North', label: 'Ash Sharqiyah North 北沙尔奇亚', aliases: ['North Sharqiyah'] },
    { value: 'Ash Sharqiyah South', label: 'Ash Sharqiyah South 南沙尔奇亚', aliases: ['South Sharqiyah'] },
    { value: 'Ad Dhahirah', label: 'Ad Dhahirah 达希拉', aliases: ['Dhahirah'] },
    { value: 'Al Wusta', label: 'Al Wusta 中部省', aliases: ['Wusta'] }
  ],
  AE: [
    { value: 'Abu Dhabi', label: 'Abu Dhabi 阿布扎比', aliases: ['AUH'] },
    { value: 'Dubai', label: 'Dubai 迪拜', aliases: ['DXB'] },
    { value: 'Sharjah', label: 'Sharjah 沙迦', aliases: ['SHJ'] },
    { value: 'Ajman', label: 'Ajman 阿治曼', aliases: [] },
    { value: 'Umm Al Quwain', label: 'Umm Al Quwain 乌姆盖万', aliases: ['Umm al-Quwain', 'UAQ'] },
    { value: 'Ras Al Khaimah', label: 'Ras Al Khaimah 拉斯海玛', aliases: ['RAK'] },
    { value: 'Fujairah', label: 'Fujairah 富查伊拉', aliases: ['Fujeirah'] }
  ],
  ZA: [
    { value: 'Eastern Cape', label: 'Eastern Cape 东开普省', aliases: [] },
    { value: 'Free State', label: 'Free State 自由邦省', aliases: [] },
    { value: 'Gauteng', label: 'Gauteng 豪登省', aliases: [] },
    { value: 'KwaZulu-Natal', label: 'KwaZulu-Natal 夸祖鲁-纳塔尔省', aliases: ['KZN'] },
    { value: 'Limpopo', label: 'Limpopo 林波波省', aliases: [] },
    { value: 'Mpumalanga', label: 'Mpumalanga 普马兰加省', aliases: [] },
    { value: 'Northern Cape', label: 'Northern Cape 北开普省', aliases: [] },
    { value: 'North West', label: 'North West 西北省', aliases: [] },
    { value: 'Western Cape', label: 'Western Cape 西开普省', aliases: [] }
  ],
  JP: [
    { value: 'Tokyo', label: 'Tokyo 东京都', aliases: ['东京', '東京都'] },
    { value: 'Osaka', label: 'Osaka 大阪府', aliases: ['大阪'] },
    { value: 'Kanagawa', label: 'Kanagawa 神奈川县', aliases: ['神奈川'] }
  ]
};

const normalizeSearchText = (value: string) => value.trim().toLowerCase();

const buildLocationOption = (value: string, label: string, aliases: string[] = []): LocationOption => ({
  value,
  label,
  searchText: normalizeSearchText([value, label, ...aliases].join(' '))
});

type RegionDisplayNames = {
  of(code: string): string | undefined;
};

const DisplayNamesCtor = (Intl as typeof Intl & {
  DisplayNames?: new (locales: string[], options: { type: 'region' }) => RegionDisplayNames;
}).DisplayNames;

const zhRegionNames = DisplayNamesCtor ? new DisplayNamesCtor(['zh-Hans'], { type: 'region' }) : undefined;
const enRegionNames = DisplayNamesCtor ? new DisplayNamesCtor(['en'], { type: 'region' }) : undefined;

const seededCountryIso2 = new Set(countrySeeds.map((country) => country.iso2));
const generatedCountrySeeds: CountrySeed[] = isoCountryRows
  .filter((country) => !seededCountryIso2.has(country.iso2))
  .map((country) => {
    const zh = zhRegionNames?.of(country.iso2) ?? country.iso2;
    const en = enRegionNames?.of(country.iso2) ?? country.iso2;
    return { zh, en, iso2: country.iso2, iso3: country.iso3 };
  });

const allCountrySeeds = [...countrySeeds, ...generatedCountrySeeds];

export const countryOptions: LocationOption[] = allCountrySeeds.map((country) =>
  buildLocationOption(
    country.zh,
    `${country.zh} / ${country.en} / ${country.iso2}`,
    [country.en, country.iso2, country.iso3, ...(country.aliases ?? [])]
  )
);

const countryKeyByAlias = new Map<string, string>();

allCountrySeeds.forEach((country) => {
  [country.zh, country.en, country.iso2, country.iso3, ...(country.aliases ?? [])].forEach((alias) => {
    countryKeyByAlias.set(normalizeSearchText(alias), country.iso2);
  });
});

const commonStateOptions = Array.from(
  new Map(
    Object.values(stateSeedsByCountry)
      .flat()
      .map((state) => [state.value, buildLocationOption(state.value, state.label, state.aliases)])
  ).values()
);

export function getStateOptions(country?: string): LocationOption[] {
  const countryKey = country ? countryKeyByAlias.get(normalizeSearchText(country)) : undefined;
  const seeds = countryKey ? stateSeedsByCountry[countryKey] : undefined;
  return seeds?.length ? seeds.map((state) => buildLocationOption(state.value, state.label, state.aliases)) : commonStateOptions;
}

export function filterLocationOption(input: string, option?: { value?: string; label?: unknown; searchText?: string }) {
  const keyword = normalizeSearchText(input);
  if (!keyword) return true;
  const optionText = option?.searchText || [option?.value, option?.label].filter(Boolean).join(' ');
  return normalizeSearchText(String(optionText)).includes(keyword);
}
