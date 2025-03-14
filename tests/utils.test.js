// utils.jsからisKoinlyCSV関数をテストするためのファイル
const fs = require('fs');
const path = require('path');
const { isKoinlyCSV, getExchange, getCurrency, formatAmount, processRow, extractParticipants } = require('../utils.js');

// テストケース
describe('isKoinlyCSV関数のテスト', () => {
    // 正常系: Koinlyのトランザクションデータの場合
    test('Koinlyのトランザクションデータの場合はtrueを返す', () => {
        const headers = [
            'Date (UTC)',
            'Type',
            'Tag',
            'From Wallet (read-only)',
            'From Wallet ID',
            'From Amount',
            'From Currency',
            'To Wallet (read-only)',
            'To Wallet ID',
            'To Amount',
            'To Currency',
            'Fee Amount',
            'Fee Currency',
            'Net Worth Amount',
            'Net Worth Currency',
            'Description'
        ];

        expect(isKoinlyCSV(headers)).toBe(true);
    });

    // 異常系: 必須ヘッダーが不足している場合
    test('必須ヘッダーが不足している場合はfalseを返す', () => {
        const headers = [
            'Date', // Date (UTC)ではない
            'Type',
            'From Amount',
            'From Currency',
            'To Amount',
            'To Currency',
            'Fee Amount',
            'Fee Currency'
        ];

        expect(isKoinlyCSV(headers)).toBe(false);
    });

    // 異常系: オプションのヘッダーが存在しない場合
    test('オプションのヘッダーが存在しない場合はfalseを返す', () => {
        const headers = [
            'Date (UTC)',
            'Type',
            'From Amount',
            'From Currency',
            'To Amount',
            'To Currency',
            'Other Header' // オプションのヘッダーではない
        ];

        expect(isKoinlyCSV(headers)).toBe(false);
    });

    // 異常系: 空のヘッダー配列の場合
    test('空のヘッダー配列の場合はfalseを返す', () => {
        const headers = [];

        expect(isKoinlyCSV(headers)).toBe(false);
    });

    // 異常系: 全く異なるCSVフォーマットの場合
    test('全く異なるCSVフォーマットの場合はfalseを返す', () => {
        const headers = [
            'Name',
            'Email',
            'Phone',
            'Address',
            'City',
            'Country'
        ];

        expect(isKoinlyCSV(headers)).toBe(false);
    });

    // 境界値: 必須ヘッダーはあるがオプションのヘッダーがない場合
    test('必須ヘッダーはあるがオプションのヘッダーがない場合はfalseを返す', () => {
        const headers = [
            'ID',
            'Date (UTC)',
            'Type',
            'From Amount',
            'From Currency',
            'To Amount',
            'To Currency'
        ];

        expect(isKoinlyCSV(headers)).toBe(false);
    });

    // 実際のKoinlyのCSVヘッダーを使用したテスト
    test('実際のKoinlyのCSVヘッダーを使用した場合はtrueを返す', () => {
        // tests/assets/transactions.csvからヘッダーを読み込む
        const csvPath = path.join(__dirname, 'assets', 'transactions.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const headers = csvContent.split('\n')[0].split(',').map(header => header.trim());

        expect(isKoinlyCSV(headers)).toBe(true);
    });
});

// 基本ユーティリティ関数のテスト
describe('基本ユーティリティ関数のテスト', () => {
    // getExchange関数のテスト
    test('getExchange - 通常のウォレット情報からは取引所名を返す', () => {
        expect(getExchange('Kraken;kraken_connect')).toBe('Kraken');
        expect(getExchange('Binance;binance')).toBe('Binance');
        expect(getExchange('Bitcoin (BTC) - xpub6D...kd;btc')).toBe('Bitcoin (BTC) - xpub6D...kd');
    });

    test('getExchange - 空またはnullのウォレットは「UnknownWallet」を返す', () => {
        expect(getExchange('')).toBe('UnknownWallet');
        expect(getExchange(null)).toBe('UnknownWallet');
        expect(getExchange(undefined)).toBe('UnknownWallet');
    });

    // getCurrency関数のテスト
    test('getCurrency - 通貨フィールドから通貨コードを抽出する', () => {
        expect(getCurrency('BTC;1')).toBe('BTC');
        expect(getCurrency('JPY;13')).toBe('JPY');
        expect(getCurrency('ETH;3')).toBe('ETH');
    });

    // formatAmount関数のテスト
    test('formatAmount - 数値を適切にフォーマットする', () => {
        expect(formatAmount(1234.5678)).toBe('1,234.5678');
        expect(formatAmount(1000)).toBe('1,000');
        expect(formatAmount(0.00012345)).toBe('0.00012345');
        expect(formatAmount(1.2000)).toBe('1.2');
    });

    test('formatAmount - 数値以外の入力はそのまま返す', () => {
        expect(formatAmount('text')).toBe('text');
        expect(formatAmount(null)).toBe(null);
    });
});

// データ処理関数のテスト
describe('データ処理関数のテスト', () => {
    // processRow関数のテスト
    test('processRow - 変換操作の場合、正しいシーケンス行を生成する', () => {
        const row = {
            'From Wallet (read-only)': 'Binance;binance',
            'To Wallet (read-only)': 'Kraken;kraken_connect',
            'From Currency': 'BTC;1',
            'To Currency': 'JPY;13',
            'Sum of From Amount': 0.1,
            'Sum of To Amount': 120000
        };

        expect(processRow(row)).toBe('Binance (BTC)->>Kraken (JPY): 0.1BTC -> 120,000JPY');
    });

    test('processRow - 出金操作の場合、正しいシーケンス行を生成する', () => {
        const row = {
            'From Wallet (read-only)': 'Kraken;kraken_connect',
            'To Wallet (read-only)': '',
            'From Currency': 'BTC;1',
            'To Currency': '',
            'Sum of From Amount': 0.3,
            'Sum of To Amount': 0
        };

        expect(processRow(row)).toBe('Kraken (BTC)->>UnknownWallet (BTC): 0.3BTCをWithdraw');
    });

    test('processRow - 入金操作の場合、正しいシーケンス行を生成する', () => {
        const row = {
            'From Wallet (read-only)': '',
            'To Wallet (read-only)': 'Binance;binance',
            'From Currency': '',
            'To Currency': 'ETH;3',
            'Sum of From Amount': 0,
            'Sum of To Amount': 1.5
        };

        expect(processRow(row)).toBe('UnknownWallet (ETH)->>Binance (ETH): 1.5ETHをDeposit');
    });

    // extractParticipants関数のテスト
    test('extractParticipants - 行からparticipantを正しく抽出する', () => {
        const row = {
            'From Wallet (read-only)': 'Binance;binance',
            'To Wallet (read-only)': 'Kraken;kraken_connect',
            'From Currency': 'BTC;1',
            'To Currency': 'JPY;13'
        };

        const participants = extractParticipants(row);
        expect(participants).toContain('Binance (BTC)');
        expect(participants).toContain('Kraken (JPY)');
        expect(participants.length).toBe(2);
    });

    test('extractParticipants - UnknownWalletを正しく処理する', () => {
        const row = {
            'From Wallet (read-only)': '',
            'To Wallet (read-only)': 'Binance;binance',
            'From Currency': '',
            'To Currency': 'ETH;3'
        };

        const participants = extractParticipants(row);
        expect(participants).toContain('UnknownWallet (ETH)');
        expect(participants).toContain('Binance (ETH)');
        expect(participants.length).toBe(2);
    });
});

// 取引相殺関数のテスト
describe('取引相殺関数のテスト', () => {
    // getTransactionKey関数のテスト
    test('getTransactionKey - 取引の方向を無視したキーを生成する', () => {
        const { getTransactionKey } = require('../utils.js');

        const row1 = {
            'From Wallet (read-only)': 'Binance;binance',
            'To Wallet (read-only)': 'Kraken;kraken_connect',
            'From Currency': 'BTC;1',
            'To Currency': 'JPY;13'
        };

        const row2 = {
            'From Wallet (read-only)': 'Kraken;kraken_connect',
            'To Wallet (read-only)': 'Binance;binance',
            'From Currency': 'JPY;13',
            'To Currency': 'BTC;1'
        };

        // 順序が逆でも同じキーを生成することを確認
        expect(getTransactionKey(row1)).toBe(getTransactionKey(row2));
        expect(getTransactionKey(row1)).toBe('BTC-JPY:Binance-Kraken');
    });

    test('getTransactionKey - UnknownWalletを含む取引も正しくキーを生成する', () => {
        const { getTransactionKey } = require('../utils.js');

        const row = {
            'From Wallet (read-only)': '',
            'To Wallet (read-only)': 'Binance;binance',
            'From Currency': 'BTC;1',
            'To Currency': 'BTC;1'
        };

        expect(getTransactionKey(row)).toBe('BTC-BTC:Binance-UnknownWallet');
    });

    // isReverseTransaction関数のテスト
    test('isReverseTransaction - 逆方向の取引を正しく判定する', () => {
        const { isReverseTransaction } = require('../utils.js');

        const row1 = {
            'From Wallet (read-only)': 'Binance;binance',
            'To Wallet (read-only)': 'Kraken;kraken_connect',
            'From Currency': 'BTC;1',
            'To Currency': 'JPY;13'
        };

        const row2 = {
            'From Wallet (read-only)': 'Kraken;kraken_connect',
            'To Wallet (read-only)': 'Binance;binance',
            'From Currency': 'JPY;13',
            'To Currency': 'BTC;1'
        };

        expect(isReverseTransaction(row1, row2)).toBe(true);
    });

    test('isReverseTransaction - 逆方向でない取引はfalseを返す', () => {
        const { isReverseTransaction } = require('../utils.js');

        const row1 = {
            'From Wallet (read-only)': 'Binance;binance',
            'To Wallet (read-only)': 'Kraken;kraken_connect',
            'From Currency': 'BTC;1',
            'To Currency': 'JPY;13'
        };

        const row2 = {
            'From Wallet (read-only)': 'Binance;binance',
            'To Wallet (read-only)': 'Kraken;kraken_connect',
            'From Currency': 'ETH;3',
            'To Currency': 'JPY;13'
        };

        expect(isReverseTransaction(row1, row2)).toBe(false);
    });

    // offsetTransactions関数のテスト (簡単な例でテスト)
    test('offsetTransactions - 逆取引を相殺する', () => {
        const { offsetTransactions } = require('../utils.js');

        // 簡単なテストデータ
        const transactions = [
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'BTC;1',
                'To Currency': 'JPY;13',
                'Sum of From Amount': 1,
                'Sum of To Amount': 5000000
            },
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance',
                'From Currency': 'JPY;13',
                'To Currency': 'BTC;1',
                'Sum of From Amount': 4000000,
                'Sum of To Amount': 0.8
            }
        ];

        const result = offsetTransactions(transactions);

        // 1 BTC → 5,000,000 JPY と 4,000,000 JPY → 0.8 BTC の相殺結果
        // 残りは 0.2 BTC → 1,000,000 JPY となるはず
        expect(result.length).toBe(1);
        expect(result[0]['Sum of From Amount']).toBeCloseTo(0.2, 10); // 浮動小数点の精度問題に対応
        expect(result[0]['Sum of To Amount']).toBe(1000000);
        expect(result[0]['From Currency']).toBe('BTC;1');
        expect(result[0]['To Currency']).toBe('JPY;13');
    });
});

// 期間ごとのグループ化関数のテスト
describe('期間ごとのグループ化関数のテスト', () => {
    // groupTransactionsByPeriod関数のテスト
    test('groupTransactionsByPeriod - 年単位でグループ化する', () => {
        const { groupTransactionsByPeriod } = require('../utils.js');

        const transactions = [
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-15',
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'BTC;1',
                'To Currency': 'JPY;13'
            },
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-06-20',
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'ETH;3',
                'To Currency': 'JPY;13'
            },
            {
                'Years (Date (UTC))': 2022,
                'Date (UTC)': '2022-03-10',
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance',
                'From Currency': 'JPY;13',
                'To Currency': 'BTC;1'
            }
        ];

        const result = groupTransactionsByPeriod(transactions, 'year');

        // 2021年と2022年のグループがあることを確認
        expect(Object.keys(result).sort()).toEqual(['2021', '2022']);

        // 2021年のグループに2つのトランザクションがあることを確認
        expect(result['2021'].length).toBe(2);

        // 2022年のグループに1つのトランザクションがあることを確認
        expect(result['2022'].length).toBe(1);
    });

    test('groupTransactionsByPeriod - 月単位でグループ化する', () => {
        const { groupTransactionsByPeriod } = require('../utils.js');

        const transactions = [
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-15',
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect'
            },
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-20',
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect'
            },
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-03-10',
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance'
            }
        ];

        const result = groupTransactionsByPeriod(transactions, 'month');

        // 2021-01と2021-03のグループがあることを確認
        expect(Object.keys(result).sort()).toEqual(['2021-01', '2021-03']);

        // 2021-01のグループに2つのトランザクションがあることを確認
        expect(result['2021-01'].length).toBe(2);

        // 2021-03のグループに1つのトランザクションがあることを確認
        expect(result['2021-03'].length).toBe(1);
    });

    test('groupTransactionsByPeriod - 日単位でグループ化する', () => {
        const { groupTransactionsByPeriod } = require('../utils.js');

        const transactions = [
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-15',
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect'
            },
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-15',
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect'
            },
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-16',
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance'
            }
        ];

        const result = groupTransactionsByPeriod(transactions, 'day');

        // 2021-01-15と2021-01-16のグループがあることを確認
        expect(Object.keys(result).sort()).toEqual(['2021-01-15', '2021-01-16']);

        // 2021-01-15のグループに2つのトランザクションがあることを確認
        expect(result['2021-01-15'].length).toBe(2);

        // 2021-01-16のグループに1つのトランザクションがあることを確認
        expect(result['2021-01-16'].length).toBe(1);
    });

    test('groupTransactionsByPeriod - まとめない場合は日付ごとにグループ化する', () => {
        const { groupTransactionsByPeriod } = require('../utils.js');

        const transactions = [
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-15',
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect'
            },
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-15',
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect'
            },
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-16',
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance'
            }
        ];

        const result = groupTransactionsByPeriod(transactions, 'none');

        // 2021-01-15と2021-01-16のグループがあることを確認
        expect(Object.keys(result).sort()).toEqual(['2021-01-15', '2021-01-16']);

        // 2021-01-15のグループに2つのトランザクションがあることを確認
        expect(result['2021-01-15'].length).toBe(2);

        // 2021-01-16のグループに1つのトランザクションがあることを確認
        expect(result['2021-01-16'].length).toBe(1);
    });

    test('groupTransactionsByPeriod - 日付情報がない場合は年情報を使用する', () => {
        const { groupTransactionsByPeriod } = require('../utils.js');

        const transactions = [
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect'
            },
            {
                'Years (Date (UTC))': 2022,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect'
            }
        ];

        const result = groupTransactionsByPeriod(transactions, 'year');

        // 2021と2022のグループがあることを確認
        expect(Object.keys(result).sort()).toEqual(['2021', '2022']);

        // 各グループに1つのトランザクションがあることを確認
        expect(result['2021'].length).toBe(1);
        expect(result['2022'].length).toBe(1);
    });
});

// 残高計算と集計関数のテスト
describe('残高計算と集計関数のテスト', () => {
    // calculateYearlyBalanceChanges関数のテスト
    test('calculateYearlyBalanceChanges - 年ごとの残高変動を正しく計算する', () => {
        const { calculateYearlyBalanceChanges } = require('../utils.js');

        const transactions = [
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': '',
                'From Currency': 'BTC;1',
                'To Currency': '',
                'Sum of From Amount': 1,
                'Sum of To Amount': 0
            },
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': '',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': '',
                'To Currency': 'ETH;3',
                'Sum of From Amount': 0,
                'Sum of To Amount': 10
            },
            {
                'Years (Date (UTC))': 2022,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'BTC;1',
                'To Currency': 'JPY;13',
                'Sum of From Amount': 0.5,
                'Sum of To Amount': 2500000
            }
        ];

        const [yearlyChanges, yearlyCurrencyTotals] = calculateYearlyBalanceChanges(transactions);

        // 2021年の変動をテスト
        expect(yearlyChanges[2021]['Binance (BTC)']).toBe(-1);
        expect(yearlyChanges[2021]['Kraken (ETH)']).toBe(10);

        // 2022年の変動をテスト
        expect(yearlyChanges[2022]['Binance (BTC)']).toBe(-0.5);
        expect(yearlyChanges[2022]['Kraken (JPY)']).toBe(2500000);

        // 通貨合計をテスト
        expect(yearlyCurrencyTotals[2021]['BTC']).toBe(-1);
        expect(yearlyCurrencyTotals[2021]['ETH']).toBe(10);
        expect(yearlyCurrencyTotals[2022]['BTC']).toBe(-0.5);
        expect(yearlyCurrencyTotals[2022]['JPY']).toBe(2500000);
    });
});
