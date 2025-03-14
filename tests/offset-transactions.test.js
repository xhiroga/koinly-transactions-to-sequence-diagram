// 逆取引の相殺機能のテスト
const { offsetTransactions, generateSequenceDiagram } = require('../utils.js');

describe('逆取引の相殺機能のテスト', () => {
    // 基本的な相殺のテスト
    test('基本的な逆取引の相殺が正しく動作する', () => {
        // テストデータ: BTC <-> JPY の交換
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

    // 複数の逆取引の相殺テスト
    test('複数の逆取引が正しく相殺される', () => {
        const transactions = [
            // BTC <-> JPY の交換 (1)
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'BTC;1',
                'To Currency': 'JPY;13',
                'Sum of From Amount': 1,
                'Sum of To Amount': 5000000
            },
            // BTC <-> JPY の交換 (2)
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance',
                'From Currency': 'JPY;13',
                'To Currency': 'BTC;1',
                'Sum of From Amount': 3000000,
                'Sum of To Amount': 0.6
            },
            // ETH <-> JPY の交換 (1)
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'ETH;3',
                'To Currency': 'JPY;13',
                'Sum of From Amount': 10,
                'Sum of To Amount': 2000000
            },
            // ETH <-> JPY の交換 (2)
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance',
                'From Currency': 'JPY;13',
                'To Currency': 'ETH;3',
                'Sum of From Amount': 1500000,
                'Sum of To Amount': 7.5
            }
        ];

        const result = offsetTransactions(transactions);

        // 結果は2つの取引になるはず
        expect(result.length).toBe(2);

        // BTC <-> JPY の相殺結果
        const btcJpyResult = result.find(r => r['From Currency'] === 'BTC;1');
        expect(btcJpyResult).toBeDefined();
        expect(btcJpyResult['Sum of From Amount']).toBeCloseTo(0.4, 10);
        expect(btcJpyResult['Sum of To Amount']).toBe(2000000);

        // ETH <-> JPY の相殺結果
        const ethJpyResult = result.find(r => r['From Currency'] === 'ETH;3');
        expect(ethJpyResult).toBeDefined();
        expect(ethJpyResult['Sum of From Amount']).toBeCloseTo(2.5, 10);
        expect(ethJpyResult['Sum of To Amount']).toBe(500000);
    });

    // 異なる年の取引は相殺されないことを確認するテスト
    test('異なる年の取引は相殺されない', () => {
        const transactions = [
            // 2021年の取引
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'BTC;1',
                'To Currency': 'JPY;13',
                'Sum of From Amount': 1,
                'Sum of To Amount': 5000000
            },
            // 2022年の取引（逆方向）
            {
                'Years (Date (UTC))': 2022,
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance',
                'From Currency': 'JPY;13',
                'To Currency': 'BTC;1',
                'Sum of From Amount': 4000000,
                'Sum of To Amount': 0.8
            }
        ];

        const result = offsetTransactions(transactions);

        // 異なる年なので相殺されず、2つの取引が残るはず
        expect(result.length).toBe(2);

        // 元の取引データが変更されていないことを確認
        expect(result[0]['Sum of From Amount']).toBe(1);
        expect(result[0]['Sum of To Amount']).toBe(5000000);
        expect(result[1]['Sum of From Amount']).toBe(4000000);
        expect(result[1]['Sum of To Amount']).toBe(0.8);
    });
    // 完全に相殺される取引のテスト
    test('完全に相殺される取引は結果に含まれない', () => {
        const transactions = [
            // 取引1
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'BTC;1',
                'To Currency': 'JPY;13',
                'Sum of From Amount': 1,
                'Sum of To Amount': 5000000
            },
            // 取引2（取引1と完全に逆）
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance',
                'From Currency': 'JPY;13',
                'To Currency': 'BTC;1',
                'Sum of From Amount': 5000000,
                'Sum of To Amount': 1
            }
        ];

        const result = offsetTransactions(transactions);

        // 完全に相殺されるので結果は空になるはず
        expect(result.length).toBe(0);
    });

    // 相殺後の金額が0以下になる場合のテスト
    test('相殺後の金額が0以下になる場合は結果に含まれない', () => {
        const transactions = [
            // 取引1
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'BTC;1',
                'To Currency': 'JPY;13',
                'Sum of From Amount': 1,
                'Sum of To Amount': 5000000
            },
            // 取引2（取引1より大きい逆取引）
            {
                'Years (Date (UTC))': 2021,
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance',
                'From Currency': 'JPY;13',
                'To Currency': 'BTC;1',
                'Sum of From Amount': 6000000,
                'Sum of To Amount': 1.2
            }
        ];

        const result = offsetTransactions(transactions);

        // 相殺後は JPY -> BTC の方向で残るはず
        expect(result.length).toBe(1);
        expect(result[0]['From Currency']).toBe('JPY;13');
        expect(result[0]['To Currency']).toBe('BTC;1');
        expect(result[0]['Sum of From Amount']).toBe(1000000);
        expect(result[0]['Sum of To Amount']).toBeCloseTo(0.2, 10);
    });
});

// generateSequenceDiagram関数のオプションテスト
describe('generateSequenceDiagram関数のオプションテスト', () => {
    // 基本的なテストデータ
    const testTransactions = [
        // BTC <-> JPY の交換 (1)
        {
            'Years (Date (UTC))': 2021,
            'Date (UTC)': '2021-01-01',
            'From Wallet (read-only)': 'Binance;binance',
            'To Wallet (read-only)': 'Kraken;kraken_connect',
            'From Currency': 'BTC;1',
            'To Currency': 'JPY;13',
            'Sum of From Amount': 1,
            'Sum of To Amount': 5000000
        },
        // BTC <-> JPY の交換 (2)
        {
            'Years (Date (UTC))': 2021,
            'Date (UTC)': '2021-01-02',
            'From Wallet (read-only)': 'Kraken;kraken_connect',
            'To Wallet (read-only)': 'Binance;binance',
            'From Currency': 'JPY;13',
            'To Currency': 'BTC;1',
            'Sum of From Amount': 4000000,
            'Sum of To Amount': 0.8
        }
    ];

    // offset=trueの場合のテスト
    test('offset=trueの場合、逆取引が相殺される', () => {
        const options = {
            offset: true,
            aggregatePeriod: 'year'
        };

        const diagram = generateSequenceDiagram(testTransactions, options);

        // 相殺されるので、1つの取引だけが含まれるはず
        expect(diagram).toContain('Binance (BTC)->>Kraken (JPY): 0.2BTC -> 1,000,000JPY');
        // 元の取引は含まれないはず
        expect(diagram).not.toContain('Binance (BTC)->>Kraken (JPY): 1BTC -> 5,000,000JPY');
        expect(diagram).not.toContain('Kraken (JPY)->>Binance (BTC): 4,000,000JPY -> 0.8BTC');
    });

    // offset=falseの場合のテスト
    test('offset=falseの場合、逆取引は相殺されない', () => {
        const options = {
            offset: false,
            aggregatePeriod: 'year'
        };

        const diagram = generateSequenceDiagram(testTransactions, options);

        // 相殺されないので、両方の取引が含まれるはず
        expect(diagram).toContain('Binance (BTC)->>Kraken (JPY): 1BTC -> 5,000,000JPY');
        expect(diagram).toContain('Kraken (JPY)->>Binance (BTC): 4,000,000JPY -> 0.8BTC');
    });

    // aggregatePeriod='none'の場合のテスト
    test('aggregatePeriod=noneの場合、取引はまとめられない', () => {
        const options = {
            offset: true, // offsetがtrueでも
            aggregatePeriod: 'none' // aggregatePeriodがnoneなら相殺されない
        };

        const diagram = generateSequenceDiagram(testTransactions, options);

        // 日付ごとに分かれて表示されるはず
        expect(diagram).toContain('Note right of');
        expect(diagram).toContain('2021-01-01');
        expect(diagram).toContain('2021-01-02');
        // 相殺されないので、両方の取引が含まれるはず
        expect(diagram).toContain('Binance (BTC)->>Kraken (JPY): 1BTC -> 5,000,000JPY');
        expect(diagram).toContain('Kraken (JPY)->>Binance (BTC): 4,000,000JPY -> 0.8BTC');
    });

    // aggregatePeriod='day'の場合のテスト
    test('aggregatePeriod=dayの場合、日ごとにまとめられる', () => {
        const options = {
            offset: true,
            aggregatePeriod: 'day'
        };

        const diagram = generateSequenceDiagram(testTransactions, options);

        // 日付ごとに分かれて表示されるはず
        expect(diagram).toContain('Note right of');
        expect(diagram).toContain('2021-01-01');
        expect(diagram).toContain('2021-01-02');
        // 日が異なるので相殺されず、両方の取引が含まれるはず
        expect(diagram).toContain('Binance (BTC)->>Kraken (JPY): 1BTC -> 5,000,000JPY');
        expect(diagram).toContain('Kraken (JPY)->>Binance (BTC): 4,000,000JPY -> 0.8BTC');
    });

    // 同じ日の取引が相殺されるテスト
    test('同じ日の取引は相殺される（aggregatePeriod=day, offset=true）', () => {
        // 同じ日の取引
        const sameDay = [
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-01',
                'From Wallet (read-only)': 'Binance;binance',
                'To Wallet (read-only)': 'Kraken;kraken_connect',
                'From Currency': 'BTC;1',
                'To Currency': 'JPY;13',
                'Sum of From Amount': 1,
                'Sum of To Amount': 5000000
            },
            {
                'Years (Date (UTC))': 2021,
                'Date (UTC)': '2021-01-01',
                'From Wallet (read-only)': 'Kraken;kraken_connect',
                'To Wallet (read-only)': 'Binance;binance',
                'From Currency': 'JPY;13',
                'To Currency': 'BTC;1',
                'Sum of From Amount': 4000000,
                'Sum of To Amount': 0.8
            }
        ];

        const options = {
            offset: true,
            aggregatePeriod: 'day'
        };

        const diagram = generateSequenceDiagram(sameDay, options);

        // 同じ日なので相殺され、1つの取引だけが含まれるはず
        expect(diagram).toContain('2021-01-01');
        expect(diagram).toContain('Binance (BTC)->>Kraken (JPY): 0.2BTC -> 1,000,000JPY');
        // 元の取引は含まれないはず
        expect(diagram).not.toContain('Binance (BTC)->>Kraken (JPY): 1BTC -> 5,000,000JPY');
        expect(diagram).not.toContain('Kraken (JPY)->>Binance (BTC): 4,000,000JPY -> 0.8BTC');
    });
});