// utils.jsからisKoinlyCSV関数をテストするためのファイル
const fs = require('fs');
const path = require('path');
const { isKoinlyCSV } = require('../utils.js');

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