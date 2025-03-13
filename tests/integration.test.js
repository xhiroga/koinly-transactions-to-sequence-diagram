// CSVからシーケンス図生成までの結合テスト
const fs = require('fs');
const path = require('path');
const { 
  generateSequenceDiagram,
  offsetTransactions
} = require('../utils.js');

describe('シーケンス図生成の結合テスト', () => {
  // CSVファイルを読み込みトランザクションデータに変換するヘルパー関数
  function loadTransactionsFromCSV(csvPath) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    // 必要なヘッダーのインデックスを特定
    const dateIndex = headers.indexOf('Date (UTC)');
    const fromWalletIndex = headers.indexOf('From Wallet (read-only)');
    const toWalletIndex = headers.indexOf('To Wallet (read-only)');
    const fromCurrencyIndex = headers.indexOf('From Currency');
    const toCurrencyIndex = headers.indexOf('To Currency');
    const fromAmountIndex = headers.indexOf('From Amount');
    const toAmountIndex = headers.indexOf('To Amount');
    
    const transactions = [];
    
    // 2行目から処理（1行目はヘッダー）
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      if (values.length <= Math.max(dateIndex, fromWalletIndex, toWalletIndex, fromCurrencyIndex, toCurrencyIndex, fromAmountIndex, toAmountIndex)) {
        continue;
      }
      
      // 日付から年を抽出
      const dateStr = values[dateIndex];
      const date = new Date(dateStr);
      const year = date.getFullYear();
      
      const transaction = {
        'Years (Date (UTC))': year,
        'From Wallet (read-only)': values[fromWalletIndex],
        'To Wallet (read-only)': values[toWalletIndex],
        'From Currency': values[fromCurrencyIndex],
        'To Currency': values[toCurrencyIndex],
        'Sum of From Amount': parseFloat(values[fromAmountIndex]) || 0,
        'Sum of To Amount': parseFloat(values[toAmountIndex]) || 0
      };
      
      transactions.push(transaction);
    }
    
    return transactions;
  }
  
  test('transactions.csvからシーケンス図を正しく生成できる', () => {
    // CSVファイルの読み込み
    const csvPath = path.join(__dirname, 'assets', 'transactions.csv');
    const transactions = loadTransactionsFromCSV(csvPath);
    
    // トランザクションデータが正しく読み込まれたことを確認
    expect(transactions.length).toBeGreaterThan(0);
    
    // シーケンス図の生成
    const diagram = generateSequenceDiagram(transactions);
    
    // 基本的なシーケンス図の構文要素が含まれているか確認
    expect(diagram).toContain('sequenceDiagram');
    expect(diagram).toContain('autonumber');
    expect(diagram).toContain('participant');
    
    // 取引の種類ごとの構文が正しく生成されているか確認
    // 入金操作
    expect(diagram).toMatch(/[A-Z]+ \(外部アドレス\)>>[A-Z]+ \([^)]+\): [\d,.]+[A-Z]+をDeposit/);
    
    // 出金操作
    expect(diagram).toMatch(/[A-Z]+ \([^)]+\)>>[A-Z]+ \(外部アドレス\): [\d,.]+[A-Z]+をWithdraw/);
    
    // 取引所間の移動や通貨変換
    expect(diagram).toMatch(/[A-Z]+ \([^)]+\)>>[A-Z]+ \([^)]+\): [\d,.]+[A-Z]+ -> [\d,.]+[A-Z]+/);
  });
  test('取引集約機能が正しく動作する', () => {
    // 集約テスト用のトランザクションデータ
    const testTransactions = [
      {
        'Years (Date (UTC))': 2021,
        'From Wallet (read-only)': 'Binance;binance',
        'To Wallet (read-only)': 'Kraken;kraken_connect',
        'From Currency': 'BTC;1',
        'To Currency': 'JPY;13',
        'Sum of From Amount': 0.1,
        'Sum of To Amount': 500000
      },
      {
        'Years (Date (UTC))': 2021,
        'From Wallet (read-only)': 'Binance;binance',
        'To Wallet (read-only)': 'Kraken;kraken_connect',
        'From Currency': 'BTC;1',
        'To Currency': 'JPY;13',
        'Sum of From Amount': 0.2,
        'Sum of To Amount': 1000000
      }
    ];
    
    const { aggregateTransactions } = require('../utils.js');
    const result = aggregateTransactions(testTransactions);
    
    // 取引が1つにまとめられていることを確認
    expect(result.length).toBe(1);
    expect(result[0]['Sum of From Amount']).toBe(0.3);
    expect(result[0]['Sum of To Amount']).toBe(1500000);
    
    // シーケンス図に正しく反映されることを確認
    const diagram = generateSequenceDiagram(testTransactions);
    expect(diagram).toContain('BTC (Binance)>>JPY (Kraken): 0.3BTC -> 1,500,000JPY');
  });
  
  test('逆取引の相殺機能が正しく動作する', () => {
    // 相殺テスト用のトランザクションデータ
    const testTransactions = [
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
    
    // 相殺処理
    const offsetResults = offsetTransactions(testTransactions);
    
    // 相殺後は1つのトランザクションになるはず
    expect(offsetResults.length).toBe(1);
    
    // 相殺後のトランザクションが正しいか確認
    const offsetResult = offsetResults[0];
    expect(offsetResult['From Currency']).toBe('BTC;1');
    expect(offsetResult['To Currency']).toBe('JPY;13');
    expect(offsetResult['Sum of From Amount']).toBeCloseTo(0.2, 10);
    expect(offsetResult['Sum of To Amount']).toBe(1000000);
    
    // no_offset: trueでシーケンス図を生成した場合、相殺されないことを確認
    const diagramWithoutOffset = generateSequenceDiagram(testTransactions, true);
    expect(diagramWithoutOffset).toContain('BTC (Binance)>>JPY (Kraken): 1BTC -> 5,000,000JPY');
    expect(diagramWithoutOffset).toContain('JPY (Kraken)>>BTC (Binance): 4,000,000JPY -> 0.8BTC');
    
    // no_offset: falseでシーケンス図を生成した場合、相殺されることを確認
    const diagramWithOffset = generateSequenceDiagram(testTransactions, false);
    expect(diagramWithOffset).toContain('BTC (Binance)>>JPY (Kraken): 0.2BTC -> 1,000,000JPY');
    expect(diagramWithOffset).not.toContain('JPY (Kraken)>>BTC (Binance): 4,000,000JPY -> 0.8BTC');
  });
});