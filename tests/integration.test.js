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
  });
});