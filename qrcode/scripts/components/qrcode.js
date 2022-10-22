/*! jquery-qrcode v0.14.0 - https://larsjung.de/jquery-qrcode/ */
const vendorQRcode = function () {
    // `qrcode` is the single public function defined by the `QR Code Generator`
    //---------------------------------------------------------------------
    //
    // QR Code Generator for JavaScript
    //
    // Copyright (c) 2009 Kazuhiko Arase
    //
    // URL: http://www.d-project.com/
    //
    // Licensed under the MIT license:
    //  http://www.opensource.org/licenses/mit-license.php
    //
    // The word 'QR Code' is registered trademark of
    // DENSO WAVE INCORPORATED
    //  http://www.denso-wave.com/qrcode/faqpatent-e.html
    //
    //---------------------------------------------------------------------

    const qrcode = (function () {
        //---------------------------------------------------------------------
        // qrcode
        //---------------------------------------------------------------------

        /**
         * qrcode
         * @param typeNumber 1 to 40
         * @param errorCorrectLevel 'L','M','Q','H'
         */
        const qrcode = function (typeNumber, errorCorrectLevel) {
            const PAD0 = 0xec;
            const PAD1 = 0x11;

            const _typeNumber = typeNumber;
            const _errorCorrectLevel = QRErrorCorrectLevel[errorCorrectLevel];
            let _modules = null;
            let _moduleCount = 0;
            let _dataCache = null;
            const _dataList = [];

            const _thisQRcode = {};

            const makeImpl = function (test, maskPattern) {
                _moduleCount = _typeNumber * 4 + 17;
                _modules = (function (moduleCount) {
                    const modules = new Array(moduleCount);
                    for (let row = 0; row < moduleCount; row += 1) {
                        modules[row] = new Array(moduleCount);
                        for (let col = 0; col < moduleCount; col += 1) {
                            modules[row][col] = null;
                        }
                    }
                    return modules;
                })(_moduleCount);

                setupPositionProbePattern(0, 0);
                setupPositionProbePattern(_moduleCount - 7, 0);
                setupPositionProbePattern(0, _moduleCount - 7);
                setupPositionAdjustPattern();
                setupTimingPattern();
                setupTypeInfo(test, maskPattern);

                if (_typeNumber >= 7) {
                    setupTypeNumber(test);
                }

                if (_dataCache == null) {
                    _dataCache = createData(_typeNumber, _errorCorrectLevel, _dataList);
                }

                mapData(_dataCache, maskPattern);
            };

            const setupPositionProbePattern = function (row, col) {
                for (let r = -1; r <= 7; r += 1) {
                    if (row + r <= -1 || _moduleCount <= row + r) continue;
                    for (let c = -1; c <= 7; c += 1) {
                        if (col + c <= -1 || _moduleCount <= col + c) continue;

                        if (
                            (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
                            (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
                            (2 <= r && r <= 4 && 2 <= c && c <= 4)
                        ) {
                            _modules[row + r][col + c] = true;
                        } else {
                            _modules[row + r][col + c] = false;
                        }
                    }
                }
            };

            const getBestMaskPattern = function () {
                let minLostPoint = 0;
                let pattern = 0;

                for (let i = 0; i < 8; i += 1) {
                    makeImpl(true, i);

                    const lostPoint = QRUtil['getLostPoint'](_thisQRcode);

                    if (i === 0 || minLostPoint > lostPoint) {
                        minLostPoint = lostPoint;
                        pattern = i;
                    }
                }

                return pattern;
            };

            const setupTimingPattern = function () {
                for (let r = 8; r < _moduleCount - 8; r += 1) {
                    if (_modules[r][6] != null) {
                        continue;
                    }
                    _modules[r][6] = r % 2 === 0;
                }

                for (let c = 8; c < _moduleCount - 8; c += 1) {
                    if (_modules[6][c] != null) {
                        continue;
                    }
                    _modules[6][c] = c % 2 === 0;
                }
            };

            const setupPositionAdjustPattern = function () {
                const pos = QRUtil['getPatternPosition'](_typeNumber);
                for (let i = 0; i < pos.length; i += 1) {
                    for (let j = 0; j < pos.length; j += 1) {
                        const row = pos[i];
                        const col = pos[j];

                        if (_modules[row][col] != null) {
                            continue;
                        }

                        for (let r = -2; r <= 2; r += 1) {
                            for (let c = -2; c <= 2; c += 1) {
                                if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
                                    _modules[row + r][col + c] = true;
                                } else {
                                    _modules[row + r][col + c] = false;
                                }
                            }
                        }
                    }
                }
            };

            const setupTypeNumber = function (test) {
                const bits = QRUtil['getBCHTypeNumber'](_typeNumber);

                for (let i = 0; i < 18; i += 1) {
                    const mod = !test && ((bits >> i) & 1) === 1;
                    _modules[Math.floor(i / 3)][(i % 3) + _moduleCount - 8 - 3] = mod;
                }

                for (let i = 0; i < 18; i += 1) {
                    const mod = !test && ((bits >> i) & 1) === 1;
                    _modules[(i % 3) + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
                }
            };

            const setupTypeInfo = function (test, maskPattern) {
                const data = (_errorCorrectLevel << 3) | maskPattern;
                const bits = QRUtil['getBCHTypeInfo'](data);
                // vertical
                for (let i = 0; i < 15; i += 1) {
                    const mod = !test && ((bits >> i) & 1) === 1;

                    if (i < 6) {
                        _modules[i][8] = mod;
                    } else if (i < 8) {
                        _modules[i + 1][8] = mod;
                    } else {
                        _modules[_moduleCount - 15 + i][8] = mod;
                    }
                }

                // horizontal
                for (let i = 0; i < 15; i += 1) {
                    const mod = !test && ((bits >> i) & 1) === 1;

                    if (i < 8) {
                        _modules[8][_moduleCount - i - 1] = mod;
                    } else if (i < 9) {
                        _modules[8][15 - i - 1 + 1] = mod;
                    } else {
                        _modules[8][15 - i - 1] = mod;
                    }
                }

                // fixed module
                _modules[_moduleCount - 8][8] = !test;
            };

            const mapData = function (data, maskPattern) {
                let inc = -1;
                let row = _moduleCount - 1;
                let bitIndex = 7;
                let byteIndex = 0;
                const maskFunc = QRUtil['getMaskFunction'](maskPattern);

                for (let col = _moduleCount - 1; col > 0; col -= 2) {
                    if (col === 6) col -= 1;

                    while (true) {
                        for (let c = 0; c < 2; c += 1) {
                            if (_modules[row][col - c] == null) {
                                let dark = false;

                                if (byteIndex < data.length) {
                                    dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
                                }

                                const mask = maskFunc(row, col - c);

                                if (mask) {
                                    dark = !dark;
                                }

                                _modules[row][col - c] = dark;
                                bitIndex -= 1;

                                if (bitIndex === -1) {
                                    byteIndex += 1;
                                    bitIndex = 7;
                                }
                            }
                        }

                        row += inc;

                        if (row < 0 || _moduleCount <= row) {
                            row -= inc;
                            inc = -inc;
                            break;
                        }
                    }
                }
            };

            const createBytes = function (buffer, rsBlocks) {
                let offset = 0;

                let maxDcCount = 0;
                let maxEcCount = 0;

                const dcdata = new Array(rsBlocks.length);
                const ecdata = new Array(rsBlocks.length);

                for (let r = 0; r < rsBlocks.length; r += 1) {
                    const dcCount = rsBlocks[r]['dataCount'];
                    const ecCount = rsBlocks[r]['totalCount'] - dcCount;

                    maxDcCount = Math.max(maxDcCount, dcCount);
                    maxEcCount = Math.max(maxEcCount, ecCount);

                    dcdata[r] = new Array(dcCount);

                    for (let i = 0; i < dcdata[r].length; i += 1) {
                        dcdata[r][i] = 0xff & buffer['getBuffer']()[i + offset];
                    }
                    offset += dcCount;

                    const rsPoly = QRUtil['getErrorCorrectPolynomial'](ecCount);
                    const rawPoly = qrPolynomial(dcdata[r], rsPoly['getLength']() - 1);

                    const modPoly = rawPoly['mod'](rsPoly);
                    ecdata[r] = new Array(rsPoly['getLength']() - 1);
                    for (let i = 0; i < ecdata[r].length; i += 1) {
                        const modIndex = i + modPoly['getLength']() - ecdata[r].length;
                        ecdata[r][i] = modIndex >= 0 ? modPoly['getAt'](modIndex) : 0;
                    }
                }

                let totalCodeCount = 0;
                for (let i = 0; i < rsBlocks.length; i += 1) {
                    totalCodeCount += rsBlocks[i]['totalCount'];
                }

                const data = new Array(totalCodeCount);
                let index = 0;

                for (let i = 0; i < maxDcCount; i += 1) {
                    for (let r = 0; r < rsBlocks.length; r += 1) {
                        if (i < dcdata[r].length) {
                            data[index] = dcdata[r][i];
                            index += 1;
                        }
                    }
                }

                for (let i = 0; i < maxEcCount; i += 1) {
                    for (let r = 0; r < rsBlocks.length; r += 1) {
                        if (i < ecdata[r].length) {
                            data[index] = ecdata[r][i];
                            index += 1;
                        }
                    }
                }

                return data;
            };

            const createData = function (typeNumber, errorCorrectLevel, dataList) {
                const rsBlocks = QRRSBlock['getRSBlocks'](typeNumber, errorCorrectLevel);

                const buffer = qrBitBuffer();

                for (let i = 0; i < dataList.length; i += 1) {
                    const data = dataList[i];
                    buffer.put(data['getMode'](), 4);
                    buffer.put(data['getLength'](), QRUtil['getLengthInBits'](data['getMode'](), typeNumber));
                    data.write(buffer);
                }

                // calc num max data.
                let totalDataCount = 0;
                for (let i = 0; i < rsBlocks.length; i += 1) {
                    totalDataCount += rsBlocks[i]['dataCount'];
                }

                if (buffer['getLengthInBits']() > totalDataCount * 8) {
                    throw new Error(`code length overflow. (${buffer['getLengthInBits']()}>${totalDataCount * 8})`);
                }

                // end code
                if (buffer['getLengthInBits']() + 4 <= totalDataCount * 8) {
                    buffer['put'](0, 4);
                }

                // padding
                while (buffer['getLengthInBits']() % 8 !== 0) {
                    buffer['putBit'](false);
                }

                // padding
                while (true) {
                    if (buffer['getLengthInBits']() >= totalDataCount * 8) {
                        break;
                    }
                    buffer.put(PAD0, 8);

                    if (buffer['getLengthInBits']() >= totalDataCount * 8) {
                        break;
                    }
                    buffer['put'](PAD1, 8);
                }

                return createBytes(buffer, rsBlocks);
            };

            _thisQRcode['addData'] = function (data) {
                const newData = qr8BitByte(data);
                _dataList.push(newData);
                _dataCache = null;
            };

            _thisQRcode['isDark'] = function (row, col) {
                if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
                    throw new Error(`${row},${col}`);
                }
                return _modules[row][col];
            };

            _thisQRcode['getModuleCount'] = function () {
                return _moduleCount;
            };

            _thisQRcode['make'] = function () {
                makeImpl(false, getBestMaskPattern());
            };

            _thisQRcode['createTableTag'] = function (cellSize, margin) {
                cellSize = cellSize || 2;
                margin = typeof margin === 'undefined' ? cellSize * 4 : margin;

                let qrHtml = '';

                qrHtml += '<table style="';
                qrHtml += ' border-width: 0px; border-style: none;';
                qrHtml += ' border-collapse: collapse;';
                qrHtml += ` padding: 0px; margin: ${margin}px;`;
                qrHtml += '">';
                qrHtml += '<tbody>';

                for (let r = 0; r < _thisQRcode['getModuleCount'](); r += 1) {
                    qrHtml += '<tr>';
                    for (let c = 0; c < _thisQRcode['getModuleCount'](); c += 1) {
                        qrHtml += '<td style="';
                        qrHtml += ' border-width: 0px; border-style: none;';
                        qrHtml += ' border-collapse: collapse;';
                        qrHtml += ' padding: 0px; margin: 0px;';
                        qrHtml += ` width: ${cellSize}px;`;
                        qrHtml += ` height: ${cellSize}px;`;
                        qrHtml += ' background-color: ';
                        qrHtml += _thisQRcode['isDark'](r, c) ? '#000000' : '#ffffff';
                        qrHtml += ';';
                        qrHtml += '"/>';
                    }

                    qrHtml += '</tr>';
                }

                qrHtml += '</tbody>';
                qrHtml += '</table>';

                return qrHtml;
            };

            _thisQRcode['createImgTag'] = function (cellSize, margin) {
                cellSize = cellSize || 2;
                margin = typeof margin === 'undefined' ? cellSize * 4 : margin;

                const size = _thisQRcode['getModuleCount']() * cellSize + margin * 2;
                const min = margin;
                const max = size - margin;

                return createImgTag(size, size, (x, y) => {
                    if (min <= x && x < max && min <= y && y < max) {
                        const c = Math.floor((x - min) / cellSize);
                        const r = Math.floor((y - min) / cellSize);
                        return _thisQRcode['isDark'](r, c) ? 0 : 1;
                    }
                    return 1;
                });
            };

            return {
                addData: _thisQRcode['addData'],
                isDark: _thisQRcode['isDark'],
                getModuleCount: _thisQRcode['getModuleCount'],
                make: _thisQRcode['make'],
                createTableTag: _thisQRcode['createTableTag'],
                createImgTag: _thisQRcode['createImgTag'],
            };
        };

        //---------------------------------------------------------------------
        // qrcode.stringToBytes
        //---------------------------------------------------------------------

        qrcode['stringToBytes'] = function (s) {
            const bytes = [];
            for (let i = 0; i < s.length; i += 1) {
                const c = s.charCodeAt(i);
                bytes.push(c & 0xff);
            }
            return bytes;
        };

        //---------------------------------------------------------------------
        // qrcode.createStringToBytes
        //---------------------------------------------------------------------

        /**
         * @param unicodeData base64 string of byte array.
         * [16bit Unicode],[16bit Bytes], ...
         * @param numChars
         */
        qrcode['createStringToBytes'] = function (unicodeData, numChars) {
            // create conversion map.
            const unicodeMap = (function () {
                const bin = base64DecodeInputStream(unicodeData);
                const read = function () {
                    const b = bin['read']();
                    if (b === -1) throw new Error();
                    return b;
                };

                let count = 0;
                const unicodeMap = {};
                while (true) {
                    const b0 = bin['read']();
                    if (b0 === -1) break;
                    const b1 = read();
                    const b2 = read();
                    const b3 = read();
                    const k = String.fromCharCode((b0 << 8) | b1);
                    const v = (b2 << 8) | b3;
                    unicodeMap[k] = v;
                    count += 1;
                }
                if (count !== numChars) {
                    throw new Error(`${count}!=${numChars}`);
                }

                return unicodeMap;
            })();

            const unknownChar = '?'.charCodeAt(0);

            return function (s) {
                const bytes = [];
                for (let i = 0; i < s.length; i += 1) {
                    const c = s.charCodeAt(i);
                    if (c < 128) {
                        bytes.push(c);
                    } else {
                        const b = unicodeMap[s.charAt(i)];
                        if (typeof b === 'number') {
                            if ((b & 0xff) === b) {
                                // 1byte
                                bytes.push(b);
                            } else {
                                // 2bytes
                                bytes.push(b >>> 8);
                                bytes.push(b & 0xff);
                            }
                        } else {
                            bytes.push(unknownChar);
                        }
                    }
                }
                return bytes;
            };
        };

        //---------------------------------------------------------------------
        // QRMode
        //---------------------------------------------------------------------

        const QRMode = {
            MODE_NUMBER: 1 << 0,
            MODE_ALPHA_NUM: 1 << 1,
            MODE_8BIT_BYTE: 1 << 2,
            MODE_KANJI: 1 << 3,
        };

        //---------------------------------------------------------------------
        // QRErrorCorrectLevel
        //---------------------------------------------------------------------

        const QRErrorCorrectLevel = {
            L: 1,
            M: 0,
            Q: 3,
            H: 2,
        };

        //---------------------------------------------------------------------
        // QRMaskPattern
        //---------------------------------------------------------------------

        const QRMaskPattern = {
            PATTERN000: 0,
            PATTERN001: 1,
            PATTERN010: 2,
            PATTERN011: 3,
            PATTERN100: 4,
            PATTERN101: 5,
            PATTERN110: 6,
            PATTERN111: 7,
        };

        //---------------------------------------------------------------------
        // QRUtil
        //---------------------------------------------------------------------

        const QRUtil = (function () {
            const PATTERN_POSITION_TABLE = [
                [],
                [6, 18],
                [6, 22],
                [6, 26],
                [6, 30],
                [6, 34],
                [6, 22, 38],
                [6, 24, 42],
                [6, 26, 46],
                [6, 28, 50],
                [6, 30, 54],
                [6, 32, 58],
                [6, 34, 62],
                [6, 26, 46, 66],
                [6, 26, 48, 70],
                [6, 26, 50, 74],
                [6, 30, 54, 78],
                [6, 30, 56, 82],
                [6, 30, 58, 86],
                [6, 34, 62, 90],
                [6, 28, 50, 72, 94],
                [6, 26, 50, 74, 98],
                [6, 30, 54, 78, 102],
                [6, 28, 54, 80, 106],
                [6, 32, 58, 84, 110],
                [6, 30, 58, 86, 114],
                [6, 34, 62, 90, 118],
                [6, 26, 50, 74, 98, 122],
                [6, 30, 54, 78, 102, 126],
                [6, 26, 52, 78, 104, 130],
                [6, 30, 56, 82, 108, 134],
                [6, 34, 60, 86, 112, 138],
                [6, 30, 58, 86, 114, 142],
                [6, 34, 62, 90, 118, 146],
                [6, 30, 54, 78, 102, 126, 150],
                [6, 24, 50, 76, 102, 128, 154],
                [6, 28, 54, 80, 106, 132, 158],
                [6, 32, 58, 84, 110, 136, 162],
                [6, 26, 54, 82, 110, 138, 166],
                [6, 30, 58, 86, 114, 142, 170],
            ];
            const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
            const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
            const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

            const _thisQRutil = {};

            const getBCHDigit = function (data) {
                let digit = 0;
                while (data !== 0) {
                    digit += 1;
                    data >>>= 1;
                }
                return digit;
            };

            _thisQRutil['getBCHTypeInfo'] = function (data) {
                let d = data << 10;
                while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
                    d ^= G15 << (getBCHDigit(d) - getBCHDigit(G15));
                }
                return ((data << 10) | d) ^ G15_MASK;
            };

            _thisQRutil['getBCHTypeNumber'] = function (data) {
                let d = data << 12;
                while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
                    d ^= G18 << (getBCHDigit(d) - getBCHDigit(G18));
                }
                return (data << 12) | d;
            };

            _thisQRutil['getPatternPosition'] = function (typeNumber) {
                return PATTERN_POSITION_TABLE[typeNumber - 1];
            };

            _thisQRutil['getMaskFunction'] = function (maskPattern) {
                switch (maskPattern) {
                    case QRMaskPattern['PATTERN000']:
                        return function (i, j) {
                            return (i + j) % 2 === 0;
                        };
                    case QRMaskPattern['PATTERN001']:
                        return function (i) {
                            return i % 2 === 0;
                        };
                    case QRMaskPattern['PATTERN010']:
                        return function (i, j) {
                            return j % 3 === 0;
                        };
                    case QRMaskPattern['PATTERN011']:
                        return function (i, j) {
                            return (i + j) % 3 === 0;
                        };
                    case QRMaskPattern['PATTERN100']:
                        return function (i, j) {
                            return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
                        };
                    case QRMaskPattern['PATTERN101']:
                        return function (i, j) {
                            return ((i * j) % 2) + ((i * j) % 3) === 0;
                        };
                    case QRMaskPattern['PATTERN110']:
                        return function (i, j) {
                            return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
                        };
                    case QRMaskPattern['PATTERN111']:
                        return function (i, j) {
                            return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
                        };

                    default:
                        throw new Error(`bad maskPattern:${maskPattern}`);
                }
            };

            _thisQRutil['getErrorCorrectPolynomial'] = function (errorCorrectLength) {
                let a = qrPolynomial([1], 0);
                for (let i = 0; i < errorCorrectLength; i += 1) {
                    a = a['multiply'](qrPolynomial([1, QRMath['gexp'](i)], 0));
                }
                return a;
            };

            _thisQRutil['getLengthInBits'] = function (mode, type) {
                if (1 <= type && type < 10) {
                    // 1 - 9
                    switch (mode) {
                        case QRMode['MODE_NUMBER']:
                            return 10;
                        case QRMode['MODE_ALPHA_NUM']:
                            return 9;
                        case QRMode['MODE_8BIT_BYTE']:
                            return 8;
                        case QRMode['MODE_KANJI']:
                            return 8;
                        default:
                            throw new Error(`mode: ${mode}`);
                    }
                } else if (type < 27) {
                    // 10 - 26
                    switch (mode) {
                        case QRMode['MODE_NUMBER']:
                            return 12;
                        case QRMode['MODE_ALPHA_NUM']:
                            return 11;
                        case QRMode['MODE_8BIT_BYTE']:
                            return 16;
                        case QRMode['MODE_KANJI']:
                            return 10;
                        default:
                            throw new Error(`mode: ${mode}`);
                    }
                } else if (type < 41) {
                    // 27 - 40
                    switch (mode) {
                        case QRMode['MODE_NUMBER']:
                            return 14;
                        case QRMode['MODE_ALPHA_NUM']:
                            return 13;
                        case QRMode['MODE_8BIT_BYTE']:
                            return 16;
                        case QRMode['MODE_KANJI']:
                            return 12;
                        default:
                            throw new Error(`mode: ${mode}`);
                    }
                } else {
                    throw new Error(`type: ${type}`);
                }
            };

            _thisQRutil['getLostPoint'] = function (qrcode) {
                const moduleCount = qrcode['getModuleCount']();

                let lostPoint = 0;

                // LEVEL1

                for (let row = 0; row < moduleCount; row += 1) {
                    for (let col = 0; col < moduleCount; col += 1) {
                        let sameCount = 0;
                        const dark = qrcode['isDark'](row, col);

                        for (let r = -1; r <= 1; r += 1) {
                            if (row + r < 0 || moduleCount <= row + r) {
                                continue;
                            }

                            for (let c = -1; c <= 1; c += 1) {
                                if (col + c < 0 || moduleCount <= col + c) {
                                    continue;
                                }

                                if (r === 0 && c === 0) {
                                    continue;
                                }

                                if (dark === qrcode['isDark'](row + r, col + c)) {
                                    sameCount += 1;
                                }
                            }
                        }

                        if (sameCount > 5) {
                            lostPoint += 3 + sameCount - 5;
                        }
                    }
                }

                // LEVEL2

                for (let row = 0; row < moduleCount - 1; row += 1) {
                    for (let col = 0; col < moduleCount - 1; col += 1) {
                        let count = 0;
                        if (qrcode['isDark'](row, col)) count += 1;
                        if (qrcode['isDark'](row + 1, col)) count += 1;
                        if (qrcode['isDark'](row, col + 1)) count += 1;
                        if (qrcode['isDark'](row + 1, col + 1)) count += 1;
                        if (count === 0 || count === 4) {
                            lostPoint += 3;
                        }
                    }
                }

                // LEVEL3

                for (let row = 0; row < moduleCount; row += 1) {
                    for (let col = 0; col < moduleCount - 6; col += 1) {
                        if (
                            qrcode['isDark'](row, col) &&
                            !qrcode['isDark'](row, col + 1) &&
                            qrcode['isDark'](row, col + 2) &&
                            qrcode['isDark'](row, col + 3) &&
                            qrcode['isDark'](row, col + 4) &&
                            !qrcode['isDark'](row, col + 5) &&
                            qrcode['isDark'](row, col + 6)
                        ) {
                            lostPoint += 40;
                        }
                    }
                }

                for (let col = 0; col < moduleCount; col += 1) {
                    for (let row = 0; row < moduleCount - 6; row += 1) {
                        if (
                            qrcode['isDark'](row, col) &&
                            !qrcode['isDark'](row + 1, col) &&
                            qrcode['isDark'](row + 2, col) &&
                            qrcode['isDark'](row + 3, col) &&
                            qrcode['isDark'](row + 4, col) &&
                            !qrcode['isDark'](row + 5, col) &&
                            qrcode['isDark'](row + 6, col)
                        ) {
                            lostPoint += 40;
                        }
                    }
                }

                // LEVEL4

                let darkCount = 0;

                for (let col = 0; col < moduleCount; col += 1) {
                    for (let row = 0; row < moduleCount; row += 1) {
                        if (qrcode['isDark'](row, col)) {
                            darkCount += 1;
                        }
                    }
                }

                const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
                lostPoint += ratio * 10;

                return lostPoint;
            };
            return {
                getBCHTypeInfo: _thisQRutil['getBCHTypeInfo'],
                getBCHTypeNumber: _thisQRutil['getBCHTypeNumber'],
                getPatternPosition: _thisQRutil['getPatternPosition'],
                getMaskFunction: _thisQRutil['getMaskFunction'],
                getErrorCorrectPolynomial: _thisQRutil['getErrorCorrectPolynomial'],
                getLengthInBits: _thisQRutil['getLengthInBits'],
                getLostPoint: _thisQRutil['getLostPoint'],
            };
        })();

        //---------------------------------------------------------------------
        // QRMath
        //---------------------------------------------------------------------

        const QRMath = (function () {
            const EXP_TABLE = new Array(256);
            const LOG_TABLE = new Array(256);

            // initialize tables
            for (let i = 0; i < 8; i += 1) {
                EXP_TABLE[i] = 1 << i;
            }
            for (let i = 8; i < 256; i += 1) {
                EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
            }
            for (let i = 0; i < 255; i += 1) {
                LOG_TABLE[EXP_TABLE[i]] = i;
            }

            const _thisQRmath = {};

            _thisQRmath['glog'] = function (n) {
                if (n < 1) {
                    throw new Error(`glog(${n})`);
                }

                return LOG_TABLE[n];
            };

            _thisQRmath['gexp'] = function (n) {
                while (n < 0) {
                    n += 255;
                }

                while (n >= 256) {
                    n -= 255;
                }

                return EXP_TABLE[n];
            };

            return {
                glog: _thisQRmath['glog'],
                gexp: _thisQRmath['gexp'],
            };
        })();

        //---------------------------------------------------------------------
        // qrPolynomial
        //---------------------------------------------------------------------

        function qrPolynomial(num, shift) {
            if (typeof num.length === 'undefined') {
                throw new Error(`${num.length}/${shift}`);
            }

            const _num = (function () {
                let offset = 0;
                while (offset < num.length && num[offset] === 0) {
                    offset += 1;
                }
                const _num = new Array(num.length - offset + shift);
                for (let i = 0; i < num.length - offset; i += 1) {
                    _num[i] = num[i + offset];
                }
                return _num;
            })();

            const _thisQRPolynomial = {};

            _thisQRPolynomial['getAt'] = function (index) {
                return _num[index];
            };

            _thisQRPolynomial['getLength'] = function () {
                return _num.length;
            };

            _thisQRPolynomial['multiply'] = function (e) {
                const num = new Array(_thisQRPolynomial['getLength']() + e['getLength']() - 1);

                for (let i = 0; i < _thisQRPolynomial['getLength'](); i += 1) {
                    for (let j = 0; j < e['getLength'](); j += 1) {
                        num[i + j] ^= QRMath['gexp'](
                            QRMath['glog'](_thisQRPolynomial['getAt'](i)) + QRMath['glog'](e['getAt'](j)),
                        );
                    }
                }
                return qrPolynomial(num, 0);
            };

            _thisQRPolynomial['mod'] = function (e) {
                if (_thisQRPolynomial['getLength']() - e['getLength']() < 0) {
                    return _thisQRPolynomial;
                }

                const ratio = QRMath['glog'](_thisQRPolynomial['getAt'](0)) - QRMath['glog'](e['getAt'](0));

                const num = new Array(_thisQRPolynomial['getLength']());
                for (let i = 0; i < _thisQRPolynomial['getLength'](); i += 1) {
                    num[i] = _thisQRPolynomial['getAt'](i);
                }

                for (let i = 0; i < e['getLength'](); i += 1) {
                    num[i] ^= QRMath['gexp'](QRMath['glog'](e['getAt'](i)) + ratio);
                }

                // recursive call
                return qrPolynomial(num, 0)['mod'](e);
            };

            return {
                getAt: _thisQRPolynomial['getAt'],
                getLength: _thisQRPolynomial['getLength'],
                multiply: _thisQRPolynomial['multiply'],
                mod: _thisQRPolynomial['mod'],
            };
        }

        //---------------------------------------------------------------------
        // QRRSBlock
        //---------------------------------------------------------------------

        const QRRSBlock = (function () {
            const RS_BLOCK_TABLE = [
                // L
                // M
                // Q
                // H

                // 1
                [1, 26, 19],
                [1, 26, 16],
                [1, 26, 13],
                [1, 26, 9],

                // 2
                [1, 44, 34],
                [1, 44, 28],
                [1, 44, 22],
                [1, 44, 16],

                // 3
                [1, 70, 55],
                [1, 70, 44],
                [2, 35, 17],
                [2, 35, 13],

                // 4
                [1, 100, 80],
                [2, 50, 32],
                [2, 50, 24],
                [4, 25, 9],

                // 5
                [1, 134, 108],
                [2, 67, 43],
                [2, 33, 15, 2, 34, 16],
                [2, 33, 11, 2, 34, 12],

                // 6
                [2, 86, 68],
                [4, 43, 27],
                [4, 43, 19],
                [4, 43, 15],

                // 7
                [2, 98, 78],
                [4, 49, 31],
                [2, 32, 14, 4, 33, 15],
                [4, 39, 13, 1, 40, 14],

                // 8
                [2, 121, 97],
                [2, 60, 38, 2, 61, 39],
                [4, 40, 18, 2, 41, 19],
                [4, 40, 14, 2, 41, 15],

                // 9
                [2, 146, 116],
                [3, 58, 36, 2, 59, 37],
                [4, 36, 16, 4, 37, 17],
                [4, 36, 12, 4, 37, 13],

                // 10
                [2, 86, 68, 2, 87, 69],
                [4, 69, 43, 1, 70, 44],
                [6, 43, 19, 2, 44, 20],
                [6, 43, 15, 2, 44, 16],

                // 11
                [4, 101, 81],
                [1, 80, 50, 4, 81, 51],
                [4, 50, 22, 4, 51, 23],
                [3, 36, 12, 8, 37, 13],

                // 12
                [2, 116, 92, 2, 117, 93],
                [6, 58, 36, 2, 59, 37],
                [4, 46, 20, 6, 47, 21],
                [7, 42, 14, 4, 43, 15],

                // 13
                [4, 133, 107],
                [8, 59, 37, 1, 60, 38],
                [8, 44, 20, 4, 45, 21],
                [12, 33, 11, 4, 34, 12],

                // 14
                [3, 145, 115, 1, 146, 116],
                [4, 64, 40, 5, 65, 41],
                [11, 36, 16, 5, 37, 17],
                [11, 36, 12, 5, 37, 13],

                // 15
                [5, 109, 87, 1, 110, 88],
                [5, 65, 41, 5, 66, 42],
                [5, 54, 24, 7, 55, 25],
                [11, 36, 12, 7, 37, 13],

                // 16
                [5, 122, 98, 1, 123, 99],
                [7, 73, 45, 3, 74, 46],
                [15, 43, 19, 2, 44, 20],
                [3, 45, 15, 13, 46, 16],

                // 17
                [1, 135, 107, 5, 136, 108],
                [10, 74, 46, 1, 75, 47],
                [1, 50, 22, 15, 51, 23],
                [2, 42, 14, 17, 43, 15],

                // 18
                [5, 150, 120, 1, 151, 121],
                [9, 69, 43, 4, 70, 44],
                [17, 50, 22, 1, 51, 23],
                [2, 42, 14, 19, 43, 15],

                // 19
                [3, 141, 113, 4, 142, 114],
                [3, 70, 44, 11, 71, 45],
                [17, 47, 21, 4, 48, 22],
                [9, 39, 13, 16, 40, 14],

                // 20
                [3, 135, 107, 5, 136, 108],
                [3, 67, 41, 13, 68, 42],
                [15, 54, 24, 5, 55, 25],
                [15, 43, 15, 10, 44, 16],

                // 21
                [4, 144, 116, 4, 145, 117],
                [17, 68, 42],
                [17, 50, 22, 6, 51, 23],
                [19, 46, 16, 6, 47, 17],

                // 22
                [2, 139, 111, 7, 140, 112],
                [17, 74, 46],
                [7, 54, 24, 16, 55, 25],
                [34, 37, 13],

                // 23
                [4, 151, 121, 5, 152, 122],
                [4, 75, 47, 14, 76, 48],
                [11, 54, 24, 14, 55, 25],
                [16, 45, 15, 14, 46, 16],

                // 24
                [6, 147, 117, 4, 148, 118],
                [6, 73, 45, 14, 74, 46],
                [11, 54, 24, 16, 55, 25],
                [30, 46, 16, 2, 47, 17],

                // 25
                [8, 132, 106, 4, 133, 107],
                [8, 75, 47, 13, 76, 48],
                [7, 54, 24, 22, 55, 25],
                [22, 45, 15, 13, 46, 16],

                // 26
                [10, 142, 114, 2, 143, 115],
                [19, 74, 46, 4, 75, 47],
                [28, 50, 22, 6, 51, 23],
                [33, 46, 16, 4, 47, 17],

                // 27
                [8, 152, 122, 4, 153, 123],
                [22, 73, 45, 3, 74, 46],
                [8, 53, 23, 26, 54, 24],
                [12, 45, 15, 28, 46, 16],

                // 28
                [3, 147, 117, 10, 148, 118],
                [3, 73, 45, 23, 74, 46],
                [4, 54, 24, 31, 55, 25],
                [11, 45, 15, 31, 46, 16],

                // 29
                [7, 146, 116, 7, 147, 117],
                [21, 73, 45, 7, 74, 46],
                [1, 53, 23, 37, 54, 24],
                [19, 45, 15, 26, 46, 16],

                // 30
                [5, 145, 115, 10, 146, 116],
                [19, 75, 47, 10, 76, 48],
                [15, 54, 24, 25, 55, 25],
                [23, 45, 15, 25, 46, 16],

                // 31
                [13, 145, 115, 3, 146, 116],
                [2, 74, 46, 29, 75, 47],
                [42, 54, 24, 1, 55, 25],
                [23, 45, 15, 28, 46, 16],

                // 32
                [17, 145, 115],
                [10, 74, 46, 23, 75, 47],
                [10, 54, 24, 35, 55, 25],
                [19, 45, 15, 35, 46, 16],

                // 33
                [17, 145, 115, 1, 146, 116],
                [14, 74, 46, 21, 75, 47],
                [29, 54, 24, 19, 55, 25],
                [11, 45, 15, 46, 46, 16],

                // 34
                [13, 145, 115, 6, 146, 116],
                [14, 74, 46, 23, 75, 47],
                [44, 54, 24, 7, 55, 25],
                [59, 46, 16, 1, 47, 17],

                // 35
                [12, 151, 121, 7, 152, 122],
                [12, 75, 47, 26, 76, 48],
                [39, 54, 24, 14, 55, 25],
                [22, 45, 15, 41, 46, 16],

                // 36
                [6, 151, 121, 14, 152, 122],
                [6, 75, 47, 34, 76, 48],
                [46, 54, 24, 10, 55, 25],
                [2, 45, 15, 64, 46, 16],

                // 37
                [17, 152, 122, 4, 153, 123],
                [29, 74, 46, 14, 75, 47],
                [49, 54, 24, 10, 55, 25],
                [24, 45, 15, 46, 46, 16],

                // 38
                [4, 152, 122, 18, 153, 123],
                [13, 74, 46, 32, 75, 47],
                [48, 54, 24, 14, 55, 25],
                [42, 45, 15, 32, 46, 16],

                // 39
                [20, 147, 117, 4, 148, 118],
                [40, 75, 47, 7, 76, 48],
                [43, 54, 24, 22, 55, 25],
                [10, 45, 15, 67, 46, 16],

                // 40
                [19, 148, 118, 6, 149, 119],
                [18, 75, 47, 31, 76, 48],
                [34, 54, 24, 34, 55, 25],
                [20, 45, 15, 61, 46, 16],
            ];

            const qrRSBlock = function (totalCount, dataCount) {
                const _thisQRRSBlock = {};
                _thisQRRSBlock['totalCount'] = totalCount;
                _thisQRRSBlock['dataCount'] = dataCount;
                return {
                    totalCount: _thisQRRSBlock['totalCount'],
                    dataCount: _thisQRRSBlock['dataCount'],
                };
            };

            const thisQRRSBlock = {};

            const getRsBlockTable = function (typeNumber, errorCorrectLevel) {
                switch (errorCorrectLevel) {
                    case QRErrorCorrectLevel['L']:
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
                    case QRErrorCorrectLevel['M']:
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
                    case QRErrorCorrectLevel['Q']:
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
                    case QRErrorCorrectLevel['H']:
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
                    default:
                        return undefined;
                }
            };

            thisQRRSBlock['getRSBlocks'] = function (typeNumber, errorCorrectLevel) {
                const rsBlock = getRsBlockTable(typeNumber, errorCorrectLevel);

                if (typeof rsBlock === 'undefined') {
                    throw new Error(
                        `bad rs block @ typeNumber: ${typeNumber} /errorCorrectLevel: ${errorCorrectLevel}`,
                    );
                }

                const length = rsBlock.length / 3;

                const list = [];

                for (let i = 0; i < length; i += 1) {
                    const count = rsBlock[i * 3 + 0];
                    const totalCount = rsBlock[i * 3 + 1];
                    const dataCount = rsBlock[i * 3 + 2];

                    for (let j = 0; j < count; j += 1) {
                        list.push(qrRSBlock(totalCount, dataCount));
                    }
                }

                return list;
            };

            return {
                getRSBlocks: thisQRRSBlock['getRSBlocks'],
            };
        })();

        //---------------------------------------------------------------------
        // qrBitBuffer
        //---------------------------------------------------------------------

        const qrBitBuffer = function () {
            const _buffer = [];
            let _length = 0;

            const _thisQRBitBuffer = {};

            _thisQRBitBuffer['getBuffer'] = function () {
                return _buffer;
            };

            _thisQRBitBuffer['getAt'] = function (index) {
                const bufIndex = Math.floor(index / 8);
                return ((_buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
            };

            _thisQRBitBuffer['put'] = function (num, length) {
                for (let i = 0; i < length; i += 1) {
                    _thisQRBitBuffer['putBit'](((num >>> (length - i - 1)) & 1) === 1);
                }
            };

            _thisQRBitBuffer['getLengthInBits'] = function () {
                return _length;
            };

            _thisQRBitBuffer['putBit'] = function (bit) {
                const bufIndex = Math.floor(_length / 8);
                if (_buffer.length <= bufIndex) {
                    _buffer.push(0);
                }
                if (bit) {
                    _buffer[bufIndex] |= 0x80 >>> _length % 8;
                }
                _length += 1;
            };

            return {
                getBuffer: _thisQRBitBuffer['getBuffer'],
                getAt: _thisQRBitBuffer['getAt'],
                put: _thisQRBitBuffer['put'],
                getLengthInBits: _thisQRBitBuffer['getLengthInBits'],
                putBit: _thisQRBitBuffer['putBit'],
            };
        };

        //---------------------------------------------------------------------
        // qr8BitByte
        //---------------------------------------------------------------------

        const qr8BitByte = function (data) {
            const _mode = QRMode['MODE_8BIT_BYTE'];
            const _data = data;
            const _bytes = qrcode['stringToBytes'](_data);

            const _thisQR8BitByte = {};

            _thisQR8BitByte['getMode'] = function () {
                return _mode;
            };

            _thisQR8BitByte['getLength'] = function () {
                return _bytes.length;
            };

            _thisQR8BitByte['write'] = function (buffer) {
                for (let i = 0; i < _bytes.length; i += 1) {
                    buffer['put'](_bytes[i], 8);
                }
            };
            return {
                getMode: _thisQR8BitByte['getMode'],
                getLength: _thisQR8BitByte['getLength'],
                write: _thisQR8BitByte['write'],
            };
        };
        // =====================================================================
        // GIF Support etc.
        //

        // ---------------------------------------------------------------------
        //  byteArrayOutputStream
        // ---------------------------------------------------------------------

        const byteArrayOutputStream = function () {
            const _bytes = [];

            const _thisByteArrayOutputStream = {};

            _thisByteArrayOutputStream['writeByte'] = function (b) {
                _bytes.push(b & 0xff);
            };

            _thisByteArrayOutputStream['writeShort'] = function (i) {
                _thisByteArrayOutputStream['writeByte'](i);
                _thisByteArrayOutputStream['writeByte'](i >>> 8);
            };

            _thisByteArrayOutputStream['writeBytes'] = function (b, off, len) {
                off = off || 0;
                len = len || b.length;
                for (let i = 0; i < len; i += 1) {
                    _thisByteArrayOutputStream['writeByte'](b[i + off]);
                }
            };

            _thisByteArrayOutputStream['writeString'] = function (s) {
                for (let i = 0; i < s.length; i += 1) {
                    _thisByteArrayOutputStream['writeByte'](s.charCodeAt(i));
                }
            };

            _thisByteArrayOutputStream['toByteArray'] = function () {
                return _bytes;
            };

            _thisByteArrayOutputStream['toString'] = function () {
                let s = '';
                s += '[';
                for (let i = 0; i < _bytes.length; i += 1) {
                    if (i > 0) {
                        s += ',';
                    }
                    s += _bytes[i];
                }
                s += ']';
                return s;
            };

            return {
                writeByte: _thisByteArrayOutputStream['writeByte'],
                writeShort: _thisByteArrayOutputStream['writeShort'],
                writeBytes: _thisByteArrayOutputStream['writeBytes'],
                writeString: _thisByteArrayOutputStream['writeString'],
                toByteArray: _thisByteArrayOutputStream['toByteArray'],
                toString: _thisByteArrayOutputStream['toString'],
            };
        };

        //---------------------------------------------------------------------
        // base64EncodeOutputStream
        //---------------------------------------------------------------------

        const base64EncodeOutputStream = function () {
            let _buffer = 0;
            let _buflen = 0;
            let _length = 0;
            let _base64 = '';
            const _thisBase64EncodeOutputStream = {};

            const writeEncoded = function (b) {
                _base64 += String.fromCharCode(encode(b & 0x3f));
            };

            const encode = function (n) {
                if (n < 0) {
                    // error.
                } else if (n < 26) {
                    return 0x41 + n;
                } else if (n < 52) {
                    return 0x61 + (n - 26);
                } else if (n < 62) {
                    return 0x30 + (n - 52);
                } else if (n === 62) {
                    return 0x2b;
                } else if (n === 63) {
                    return 0x2f;
                }
                throw new Error(`n: ${n}`);
            };
            _thisBase64EncodeOutputStream['writeByte'] = function (n) {
                _buffer = (_buffer << 8) | (n & 0xff);
                _buflen += 8;
                _length += 1;

                while (_buflen >= 6) {
                    writeEncoded(_buffer >>> (_buflen - 6));
                    _buflen -= 6;
                }
            };

            _thisBase64EncodeOutputStream['flush'] = function () {
                if (_buflen > 0) {
                    writeEncoded(_buffer << (6 - _buflen));
                    _buffer = 0;
                    _buflen = 0;
                }

                if (_length % 3 !== 0) {
                    // padding
                    const padlen = 3 - (_length % 3);
                    for (let i = 0; i < padlen; i += 1) {
                        _base64 += '=';
                    }
                }
            };

            _thisBase64EncodeOutputStream['toString'] = function () {
                return _base64;
            };

            return {
                writeByte: _thisBase64EncodeOutputStream['writeByte'],
                flush: _thisBase64EncodeOutputStream['flush'],
                toString: _thisBase64EncodeOutputStream['toString'],
            };
        };

        //---------------------------------------------------------------------
        // base64DecodeInputStream
        //---------------------------------------------------------------------

        const base64DecodeInputStream = function (str) {
            const _str = str;
            const _thisBase64DecodeInputStream = {};
            let _buffer = 0;
            let _buflen = 0;
            let _pos = 0;

            _thisBase64DecodeInputStream['read'] = function () {
                while (_buflen < 8) {
                    if (_pos >= _str.length) {
                        if (_buflen === 0) {
                            return -1;
                        }
                        throw new Error(`unexpected end of file./'${_buflen}`);
                    }
                    const c = _str.charAt(_pos);
                    _pos += 1;

                    if (c === '=') {
                        _buflen = 0;
                        return -1;
                    } else if (c.match(/^\s$/)) {
                        // ignore if whitespace.
                        continue;
                    }

                    _buffer = (_buffer << 6) | decode(c.charCodeAt(0));
                    _buflen += 6;
                }
                const n = (_buffer >>> (_buflen - 8)) & 0xff;
                _buflen -= 8;
                return n;
            };

            const decode = function (c) {
                if (0x41 <= c && c <= 0x5a) {
                    return c - 0x41;
                } else if (0x61 <= c && c <= 0x7a) {
                    return c - 0x61 + 26;
                } else if (0x30 <= c && c <= 0x39) {
                    return c - 0x30 + 52;
                } else if (c === 0x2b) {
                    return 62;
                } else if (c === 0x2f) {
                    return 63;
                }
                throw new Error(`c: ${c}`);
            };

            return {
                read: _thisBase64DecodeInputStream['read'],
            };
        };

        //---------------------------------------------------------------------
        // gifImage (B/W)
        //---------------------------------------------------------------------
        const gifImage = function (width, height) {
            const _width = width;
            const _height = height;
            const _data = new Array(width * height);

            const _thisGifImage = {};

            _thisGifImage['setPixel'] = function (x, y, pixel) {
                _data[y * _width + x] = pixel;
            };

            _thisGifImage['write'] = function (out) {
                //---------------------------------
                // GIF Signature
                out['writeString']('GIF87a');

                //---------------------------------
                // Screen Descriptor

                out['writeShort'](_width);
                out['writeShort'](_height);

                out['writeByte'](0x80); // 2bit
                out['writeByte'](0);
                out['writeByte'](0);

                //---------------------------------
                // Global Color Map

                // black
                out['writeByte'](0x00);
                out['writeByte'](0x00);
                out['writeByte'](0x00);

                // white
                out['writeByte'](0xff);
                out['writeByte'](0xff);
                out['writeByte'](0xff);

                //---------------------------------
                // Image Descriptor

                out['writeString'](',');
                out['writeShort'](0);
                out['writeShort'](0);
                out['writeShort'](_width);
                out['writeShort'](_height);
                out['writeByte'](0);

                //---------------------------------
                // Local Color Map

                //---------------------------------
                // Raster Data

                const lzwMinCodeSize = 2;
                const raster = getLZWRaster(lzwMinCodeSize);

                out['writeByte'](lzwMinCodeSize);

                let offset = 0;

                while (raster.length - offset > 255) {
                    out['writeByte'](255);
                    out['writeBytes'](raster, offset, 255);
                    offset += 255;
                }

                out['writeByte'](raster.length - offset);
                out['writeBytes'](raster, offset, raster.length - offset);
                out['writeByte'](0x00);

                //---------------------------------
                // GIF Terminator
                out['writeString'](';');
            };

            const bitOutPutStream = function (out) {
                const _out = out;
                let _bitLength = 0;
                let _bitBuffer = 0;

                const _thisbitOutPutStream = {};

                _thisbitOutPutStream['write'] = function (data, length) {
                    if (data >>> length !== 0) {
                        throw new Error('length over');
                    }

                    while (_bitLength + length >= 8) {
                        _out['writeByte'](0xff & ((data << _bitLength) | _bitBuffer));
                        length -= 8 - _bitLength;
                        data >>>= 8 - _bitLength;
                        _bitBuffer = 0;
                        _bitLength = 0;
                    }

                    _bitBuffer = (data << _bitLength) | _bitBuffer;
                    _bitLength = _bitLength + length;
                };

                _thisbitOutPutStream['flush'] = function () {
                    if (_bitLength > 0) {
                        _out['writeByte'](_bitBuffer);
                    }
                };
                return {
                    write: _thisbitOutPutStream['write'],
                    flush: _thisbitOutPutStream['flush'],
                };
            };

            const getLZWRaster = function (lzwMinCodeSize) {
                const clearCode = 1 << lzwMinCodeSize;
                const endCode = (1 << lzwMinCodeSize) + 1;
                let bitLength = lzwMinCodeSize + 1;

                // Setup LZWTable
                const table = lzwTable();

                for (let i = 0; i < clearCode; i += 1) {
                    table['add'](String.fromCharCode(i));
                }
                table['add'](String.fromCharCode(clearCode));
                table['add'](String.fromCharCode(endCode));

                const byteOut = byteArrayOutputStream();
                const bitOut = bitOutPutStream(byteOut);

                // clear code
                bitOut['write'](clearCode, bitLength);

                let dataIndex = 0;

                let s = String.fromCharCode(_data[dataIndex]);
                dataIndex += 1;

                while (dataIndex < _data.length) {
                    const c = String.fromCharCode(_data[dataIndex]);
                    dataIndex += 1;

                    if (table['contains'](s + c)) {
                        s += c;
                    } else {
                        bitOut['write'](table['indexOf'](s), bitLength);
                        if (table['size']() < 0xfff) {
                            if (table['size']() === 1 << bitLength) {
                                bitLength += 1;
                            }
                            table['add'](s + c);
                        }
                        s = c;
                    }
                }

                bitOut['write'](table['indexOf'](s), bitLength);

                // end code
                bitOut['write'](endCode, bitLength);

                bitOut['flush']();

                return byteOut['toByteArray']();
            };

            const lzwTable = function () {
                const _map = {};
                let _size = 0;

                const _thisLzwTable = {};

                _thisLzwTable['add'] = function (key) {
                    if (_thisLzwTable['contains'](key)) {
                        throw new Error(`dup key: ${key}`);
                    }
                    _map[key] = _size;
                    _size += 1;
                };

                _thisLzwTable['size'] = function () {
                    return _size;
                };

                _thisLzwTable['indexOf'] = function (key) {
                    return _map[key];
                };

                _thisLzwTable['contains'] = function (key) {
                    return typeof _map[key] !== 'undefined';
                };

                return {
                    add: _thisLzwTable['add'],
                    size: _thisLzwTable['size'],
                    indexOf: _thisLzwTable['indexOf'],
                    contains: _thisLzwTable['contains'],
                };
            };

            return {
                setPixel: _thisGifImage['setPixel'],
                write: _thisGifImage['write'],
            };
        };

        const createImgTag = function (width, height, getPixel, alt) {
            const gif = gifImage(width, height);
            const b = byteArrayOutputStream();
            const base64 = base64EncodeOutputStream();
            const bytes = b['toByteArray']();
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    gif['setPixel'](x, y, getPixel(x, y));
                }
            }

            gif['write'](b);
            for (let i = 0; i < bytes.length; i += 1) {
                base64['writeByte'](bytes[i]);
            }
            base64['flush']();

            let img = '';
            img += '<img';
            img += '\u0020src="';
            img += 'data:image/gif;base64,';
            img += base64;
            img += '"';
            img += '\u0020width="';
            img += width;
            img += '"';
            img += '\u0020height="';
            img += height;
            img += '"';
            if (alt) {
                img += '\u0020alt="';
                img += alt;
                img += '"';
            }
            img += '/>';

            return img;
        };

        //---------------------------------------------------------------------
        // returns qrcode function.

        return qrcode;
    })();

    // (function (factory) {
    //     if (typeof define === 'function' && define.amd) {
    //         define([], factory);
    //     } else if (typeof exports === 'object') {
    //         module.exports = factory();
    //     }
    // }(function () {
    //     return qrcode;
    // }));
    //---------------------------------------------------------------------
    //
    // QR Code Generator for JavaScript UTF8 Support (optional)
    //
    // Copyright (c) 2011 Kazuhiko Arase
    //
    // URL: http://www.d-project.com/
    //
    // Licensed under the MIT license:
    //  http://www.opensource.org/licenses/mit-license.php
    //
    // The word 'QR Code' is registered trademark of
    // DENSO WAVE INCORPORATED
    //  http://www.denso-wave.com/qrcode/faqpatent-e.html
    //
    //---------------------------------------------------------------------

    (function (qrcode) {
        //---------------------------------------------------------------------
        // overwrite qrcode.stringToBytes
        //---------------------------------------------------------------------
        qrcode['stringToBytes'] = function (s) {
            // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
            function toUTF8Array(str) {
                const utf8 = [];
                for (let i = 0; i < str.length; i++) {
                    let charcode = str.charCodeAt(i);
                    if (charcode < 0x80) utf8.push(charcode);
                    else if (charcode < 0x800) {
                        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
                    } else if (charcode < 0xd800 || charcode >= 0xe000) {
                        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
                    } else {
                        // surrogate pair
                        i += 1;
                        // UTF-16 encodes 0x10000-0x10FFFF by
                        // subtracting 0x10000 and splitting the
                        // 20 bits of 0x0-0xFFFFF into two halves
                        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
                        utf8.push(
                            0xf0 | (charcode >> 18),
                            0x80 | ((charcode >> 12) & 0x3f),
                            0x80 | ((charcode >> 6) & 0x3f),
                            0x80 | (charcode & 0x3f),
                        );
                    }
                }
                return utf8;
            }

            return toUTF8Array(s);
        };
    })(qrcode);
    return qrcode; // eslint-disable-line no-undef
};
const qrcode = function (vendorQRcode) {
    // var jq = window['jQuery'];

    // Check if canvas is available in the browser (as Modernizr does)
    const hasCanvas = (function () {
        const elem = document.createElement('canvas');
        return !!(elem.getContext && elem.getContext('2d'));
    })();

    // Wrapper for the original QR code generator.
    function createQRCode(text, level, version, quiet) {
        const qr = {};

        const _vqr = Object.assign({}, vendorQRcode(version, level));
        _vqr['addData'](text);
        _vqr['make']();

        quiet = quiet || 0;

        const qrModuleCount = _vqr['getModuleCount']();
        const quietModuleCount = _vqr['getModuleCount']() + 2 * quiet;

        function isDark(row, col) {
            row -= quiet;
            col -= quiet;

            if (row < 0 || row >= qrModuleCount || col < 0 || col >= qrModuleCount) {
                return false;
            }
            return _vqr['isDark'](row, col);
        }

        function addBlank(l, t, r, b) {
            const prevIsDark = qr['isDark'];
            const moduleSize = 1 / quietModuleCount;

            qr['isDark'] = function (row, col) {
                const ml = col * moduleSize;
                const mt = row * moduleSize;
                const mr = ml + moduleSize;
                const mb = mt + moduleSize;

                return prevIsDark(row, col) && (l > mr || ml > r || t > mb || mt > b);
            };
        }

        qr['text'] = text;
        qr['level'] = level;
        qr['version'] = version;
        qr['moduleCount'] = quietModuleCount;
        qr['isDark'] = isDark;
        qr['addBlank'] = addBlank;
        return qr;
    }

    // Returns a minimal QR code for the given text starting with version `minVersion`.
    // Returns `undefined` if `text` is too long to be encoded in `maxVersion`.
    function createMinQRCode(text, level, minVersion, maxVersion, quiet) {
        minVersion = Math.max(1, minVersion || 1);
        maxVersion = Math.min(40, maxVersion || 40);
        for (let version = minVersion; version <= maxVersion; version += 1) {
            try {
                return createQRCode(text, level, version, quiet);
            } catch (err) {
                /* empty */
            }
        }
        return undefined;
    }

    function drawBackgroundLabel(qr, context, settings) {
        const size = settings['size'];
        const font = `bold ${settings['mSize'] * size}px ${settings['fontname']}`;
        const ctx = document.createElement('canvas').getContext('2d');
        // var ctx = jq('<canvas/>')[0].getContext('2d');

        ctx.font = font;

        const w = ctx.measureText(settings['label'])['width'];
        const sh = settings['mSize'];
        const sw = w / size;
        const sl = (1 - sw) * settings['mPosX'];
        const st = (1 - sh) * settings['mPosY'];
        const sr = sl + sw;
        const sb = st + sh;
        const pad = 0.01;

        if (settings['mod'] === 1) {
            // Strip
            qr['addBlank'](0, st - pad, size, sb + pad);
        } else {
            // Box
            qr['addBlank'](sl - pad, st - pad, sr + pad, sb + pad);
        }

        context['fillStyle'] = settings['fontcolor'];
        context['font'] = font;
        context['fillText'](settings['label'], sl * size, st * size + 0.75 * settings['mSize'] * size);
    }

    function drawBackgroundImage(qr, context, settings) {
        const size = settings['size'];
        const w = settings['image']['naturalWidth'] || 1;
        const h = settings['image']['naturalHeight'] || 1;
        const sh = settings['mSize'];
        const sw = (sh * w) / h;
        const sl = (1 - sw) * settings['mPosX'];
        const st = (1 - sh) * settings['mPosY'];
        const sr = sl + sw;
        const sb = st + sh;
        const pad = 0.01;

        if (settings['mode'] === 3) {
            // Strip
            qr['addBlank'](0, st - pad, size, sb + pad);
        } else {
            // Box
            qr['addBlank'](sl - pad, st - pad, sr + pad, sb + pad);
        }

        context.drawImage(settings['image'], sl * size, st * size, sw * size, sh * size);
    }

    function drawBackground(qr, context, settings) {
        if (
            settings['background'] &&
            settings['background']['tagName'] &&
            settings['background']['tagName'] === 'IMG'
        ) {
            // if (jq(settings.background).is('img')) {
            context.drawImage(settings['background'], 0, 0, settings['size'], settings['size']);
        } else if (settings['background']) {
            context.fillStyle = settings['background'];
            context.fillRect(settings['left'], settings['top'], settings['size'], settings['size']);
        }

        const mode = settings['mode'];
        if (mode === 1 || mode === 2) {
            drawBackgroundLabel(qr, context, settings);
        } else if (mode === 3 || mode === 4) {
            drawBackgroundImage(qr, context, settings);
        }
    }

    function drawModuleDefault(qr, context, settings, left, top, width, row, col) {
        if (qr['isDark'](row, col)) {
            context.rect(left, top, width, width);
        }
    }

    function drawModuleRoundedDark(ctx, l, t, r, b, rad, nw, ne, se, sw) {
        if (nw) {
            ctx.moveTo(l + rad, t);
        } else {
            ctx.moveTo(l, t);
        }

        if (ne) {
            ctx.lineTo(r - rad, t);
            ctx.arcTo(r, t, r, b, rad);
        } else {
            ctx.lineTo(r, t);
        }

        if (se) {
            ctx.lineTo(r, b - rad);
            ctx.arcTo(r, b, l, b, rad);
        } else {
            ctx.lineTo(r, b);
        }

        if (sw) {
            ctx.lineTo(l + rad, b);
            ctx.arcTo(l, b, l, t, rad);
        } else {
            ctx.lineTo(l, b);
        }

        if (nw) {
            ctx.lineTo(l, t + rad);
            ctx.arcTo(l, t, r, t, rad);
        } else {
            ctx.lineTo(l, t);
        }
    }

    function drawModuleRoundendLight(ctx, l, t, r, b, rad, nw, ne, se, sw) {
        if (nw) {
            ctx.moveTo(l + rad, t);
            ctx.lineTo(l, t);
            ctx.lineTo(l, t + rad);
            ctx.arcTo(l, t, l + rad, t, rad);
        }

        if (ne) {
            ctx.moveTo(r - rad, t);
            ctx.lineTo(r, t);
            ctx.lineTo(r, t + rad);
            ctx.arcTo(r, t, r - rad, t, rad);
        }

        if (se) {
            ctx.moveTo(r - rad, b);
            ctx.lineTo(r, b);
            ctx.lineTo(r, b - rad);
            ctx.arcTo(r, b, r - rad, b, rad);
        }

        if (sw) {
            ctx.moveTo(l + rad, b);
            ctx.lineTo(l, b);
            ctx.lineTo(l, b - rad);
            ctx.arcTo(l, b, l + rad, b, rad);
        }
    }

    function drawModuleRounded(qr, context, settings, left, top, width, row, col) {
        const isDark = qr['isDark'];
        const right = left + width;
        const bottom = top + width;
        const radius = settings['radius'] * width;
        const rowT = row - 1;
        const rowB = row + 1;
        const colL = col - 1;
        const colR = col + 1;
        const center = isDark(row, col);
        const northwest = isDark(rowT, colL);
        const north = isDark(rowT, col);
        const northeast = isDark(rowT, colR);
        const east = isDark(row, colR);
        const southeast = isDark(rowB, colR);
        const south = isDark(rowB, col);
        const southwest = isDark(rowB, colL);
        const west = isDark(row, colL);

        if (center) {
            drawModuleRoundedDark(
                context,
                left,
                top,
                right,
                bottom,
                radius,
                !north && !west,
                !north && !east,
                !south && !east,
                !south && !west,
            );
        } else {
            drawModuleRoundendLight(
                context,
                left,
                top,
                right,
                bottom,
                radius,
                north && west && northwest,
                north && east && northeast,
                south && east && southeast,
                south && west && southwest,
            );
        }
    }

    function drawModules(qr, context, settings) {
        const moduleCount = qr['moduleCount'];
        const moduleSize = settings['size'] / moduleCount;
        let fn = drawModuleDefault;
        let row;
        let col;

        if (settings['radius'] > 0 && settings['radius'] <= 0.5) {
            fn = drawModuleRounded;
        }

        context['beginPath']();
        for (row = 0; row < moduleCount; row += 1) {
            for (col = 0; col < moduleCount; col += 1) {
                const l = settings['left'] + col * moduleSize;
                const t = settings['top'] + row * moduleSize;
                const w = moduleSize;

                fn(qr, context, settings, l, t, w, row, col);
            }
        }
        if (settings['fill']['tagName'] && settings['fill']['tagName'] === 'IMG') {
            // if (jq(settings.fill).is('img')) {
            context.strokeStyle = 'rgba(0,0,0,0.5)';
            context.lineWidth = 2;
            context.stroke();
            const prev = context.globalCompositeOperation;
            context.globalCompositeOperation = 'destination-out';
            context.fill();
            context.globalCompositeOperation = prev;

            context.clip();
            context.drawImage(settings['fill'], 0, 0, settings['size'], settings['size']);
            context.restore();
        } else {
            context.fillStyle = settings['fill'];
            context.fill();
        }
    }

    // Draws QR code to the given `canvas` and returns it.
    function drawOnCanvas(canvas, settings) {
        const qr = createMinQRCode(
            settings['text'],
            settings['ecLevel'],
            settings['minVersion'],
            settings['maxVersion'],
            settings['quiet'],
        );
        if (!qr) {
            return null;
        }

        // var $canvas = jq(canvas).data('qrcode', qr);
        // var context = $canvas[0].getContext('2d');
        canvas['dataset']['qrcode'] = qr;
        const context = canvas.getContext('2d');

        drawBackground(qr, context, settings);
        drawModules(qr, context, settings);

        return canvas;
    }

    // Returns a `canvas` element representing the QR code for the given settings.
    function createCanvas(settings) {
        // var $canvas = jq('<canvas/>').attr('width', settings.size).attr('height', settings.size);
        const canvas = document.createElement('canvas');
        canvas.setAttribute('width', settings['size']);
        canvas.setAttribute('height', settings['size']);
        return drawOnCanvas(canvas, settings);
    }

    // Returns an `image` element representing the QR code for the given settings.
    function createImage(settings) {
        const img = document.createElement('img');
        // return jq('<img/>').attr('src', createCanvas(settings)[0].toDataURL('image/png'));
        return img.setAttribute('src', createCanvas(settings).toDataURL('image/png'));
    }

    // Returns a `div` element representing the QR code for the given settings.
    function createDiv(settings) {
        const qr = createMinQRCode(
            settings['text'],
            settings['ecLevel'],
            settings['minVersion'],
            settings['maxVersion'],
            settings['quiet'],
        );
        if (!qr) {
            return null;
        }

        // some shortcuts to improve compression
        const settingsSize = settings['size'];
        const settingsBgColor = settings['background'];
        const mathFloor = Math.floor;

        const moduleCount = qr['moduleCount'];
        const moduleSize = mathFloor(settingsSize / moduleCount);
        const offset = mathFloor(0.5 * (settingsSize - moduleSize * moduleCount));
        const div = document.createElement('div');
        let row;
        let col;

        const containerCSS = {
            position: 'relative',
            left: 0,
            top: 0,
            padding: 0,
            margin: 0,
            width: settingsSize,
            height: settingsSize,
        };
        const darkCSS = {
            position: 'absolute',
            padding: 0,
            margin: 0,
            width: moduleSize,
            height: moduleSize,
            'background-color': settings['fill'],
        };

        // var $div = jq('<div/>').data('qrcode', qr).css(containerCSS);

        Object.keys(containerCSS).every((value) => {
            div.style[value] = containerCSS[value];
            return div.style[value];
        });
        div['dataset']['qrcode'] = qr;
        if (settingsBgColor) {
            // $div.css('backgroundconstlor', settings_bgColor);
            // div.css('background-color', settings_bgColor);
            div.style['background-color'] = settingsBgColor;
        }

        for (row = 0; row < moduleCount; row += 1) {
            for (col = 0; col < moduleCount; col += 1) {
                if (qr['isDark'](row, col)) {
                    const extraDarkCSS = Object.assign({}, darkCSS, {
                        left: offset + col * moduleSize,
                        top: offset + row * moduleSize,
                    });
                    const _div = document.createElement('div');
                    Object.keys(extraDarkCSS).every((value) => {
                        _div.style[value] = extraDarkCSS[value];
                        return div.style[value];
                    });
                    div.appendChild(_div);
                    // jq('<div/>')
                    //     .css(darkCSS)
                    //     .css({
                    //         left: offset + col * moduleSize,
                    //         top: offset + row * moduleSize
                    //     })
                    //     .appendTo($div);
                }
            }
        }

        // return $div;
        return div;
    }

    function createHTML(settings) {
        if (hasCanvas && settings['render'] === 'canvas') {
            return createCanvas(settings);
        } else if (hasCanvas && settings['render'] === 'image') {
            return createImage(settings);
        }
        return createDiv(settings);
    }

    // Plugin
    // ======

    // Default settings
    // ----------------
    const defaults = {
        // render method: `'canvas'`, `'image'` or `'div'`
        render: 'canvas',

        // version range somewhere in 1 .. 40
        minVersion: 1,
        maxVersion: 40,

        // error correction level: `'L'`, `'M'`, `'Q'` or `'H'`
        ecLevel: 'L',

        // offset in pixel if drawn onto existing canvas
        left: 0,
        top: 0,

        // size in pixel
        size: 200,

        // code color or image element
        fill: '#000',

        // background color or image element, `null` for transparent background
        background: null,

        // content
        text: 'no text',

        // corner radius relative to module width: 0.0 .. 0.5
        radius: 0,

        // quiet zone in modules
        quiet: 0,

        // modes
        // 0: normal
        // 1: label strip
        // 2: label box
        // 3: image strip
        // 4: image box
        mode: 0,

        mSize: 0.1,
        mPosX: 0.5,
        mPosY: 0.5,

        label: 'no label',
        fontname: 'sans',
        fontcolor: '#000',

        image: null,
    };

    // Register the plugin
    // -------------------
    // jq.fn.qrcode = function (options) {
    //     var settings = jq.extend({}, defaults, options);
    //
    //     return this.each(function (idx, el) {
    //         if (el.nodeName.toLowerCase() === 'canvas') {
    //             drawOnCanvas(el, settings);
    //         } else {
    //             jq(el).append(createHTML(settings));
    //         }
    //     });
    // };
    const qrcode = function (el, options) {
        const settings = Object.assign({}, defaults, typeof options === 'object' ? options : { text: options });
        if ('length' in el) {
            for (let i = 0; i < el.length; i++) {
                if (el[i].nodeName.toLowerCase() === 'canvas') {
                    drawOnCanvas(el[i], settings);
                } else {
                    el[i].appendChild(createHTML(settings));
                }
            }
        } else {
            const nodeName = el.nodeName.toLowerCase();
            if (nodeName === 'canvas') {
                drawOnCanvas(el, settings);
            } else {
                el.appendChild(createHTML(settings));
            }
        }
    };
    return qrcode;
};
export default qrcode(vendorQRcode());
