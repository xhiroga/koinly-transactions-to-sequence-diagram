#!/usr/bin/env node

/**
 * decode-pako.js
 * mermaid.liveのURLからpakoでエンコードされた部分を抽出し、デコードするCLIツール
 * 
 * 使用方法:
 *   node decode-pako.js "https://mermaid.live/view#pako:eNpVkE1qw0AMha8iaKUW..."
 *   node decode-pako.js "pako:eNpVkE1qw0AMha8iaKUW..."
 *   node decode-pako.js "eNpVkE1qw0AMha8iaKUW..."
 */

// 必要なモジュールを読み込む
const pako = require('pako');
const { TextDecoder, TextEncoder } = require('util');

// コマンドライン引数を取得
const args = process.argv.slice(2);

// テストモードかどうか
const isTestMode = args.length > 0 && args[0] === '--test';

if (isTestMode) {
    // テストモード
    console.log('Running in test mode...');
    runTest();
} else if (args.length === 0) {
    console.error('Error: URLまたはpakoパラメータを指定してください');
    console.error('使用方法: node decode-pako.js "https://mermaid.live/view#pako:エンコードされた文字列"');
    console.error('       または: node decode-pako.js "pako:エンコードされた文字列"');
    console.error('       または: node decode-pako.js "エンコードされた文字列"');
    console.error('       または: node decode-pako.js --test (テストモード)');
    process.exit(1);
} else {
    // 通常モード
    const input = args[0];

    try {
        const decodedData = decodeInput(input);
        console.log(decodedData);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// テストを実行する関数
function runTest() {
    const testData = 'sequenceDiagram\n    participant A as Alice\n    participant B as Bob\n    A->>B: Hello Bob, how are you?\n    B->>A: I am good thanks!';

    console.log('Original data:');
    console.log(testData);
    console.log();

    // エンコード
    const encoded = pako_deflate_base64(testData);
    console.log('Encoded data:');
    console.log(encoded);
    console.log();

    // デコード
    try {
        const decoded = pako_inflate_base64(encoded);
        console.log('Decoded data:');
        console.log(decoded);
        console.log();

        // 元のデータと一致するか確認
        if (decoded === testData) {
            console.log('Test PASSED: Original data matches decoded data');
        } else {
            console.log('Test FAILED: Original data does not match decoded data');
        }

        // 通常モードのデコード処理をテスト
        console.log('\nTesting normal mode decoding with the same encoded data:');
        try {
            const normalDecoded = decodeInput(encoded);
            console.log('Normal mode decoded data:');
            console.log(normalDecoded);

            if (normalDecoded === testData) {
                console.log('Normal mode test PASSED');
            } else {
                console.log('Normal mode test FAILED: Data does not match');
            }
        } catch (error) {
            console.error('Normal mode test FAILED: Error during decoding');
            console.error(error);
        }

        // URLとpako:プレフィックスのテスト
        console.log('\nTesting URL format:');
        const urlFormat = `https://mermaid.live/view#pako:${encoded}`;
        try {
            const urlDecoded = decodeInput(urlFormat);
            console.log('URL decoded data:');
            console.log(urlDecoded);

            if (urlDecoded === testData) {
                console.log('URL test PASSED');
            } else {
                console.log('URL test FAILED: Data does not match');
            }
        } catch (error) {
            console.error('URL test FAILED: Error during decoding');
            console.error(error);
        }

        console.log('\nTesting pako: prefix:');
        const pakoPrefix = `pako:${encoded}`;
        try {
            const prefixDecoded = decodeInput(pakoPrefix);
            console.log('Prefix decoded data:');
            console.log(prefixDecoded);

            if (prefixDecoded === testData) {
                console.log('Prefix test PASSED');
            } else {
                console.log('Prefix test FAILED: Data does not match');
            }
        } catch (error) {
            console.error('Prefix test FAILED: Error during decoding');
            console.error(error);
        }
    } catch (error) {
        console.error('Test FAILED: Error during decoding');
        console.error(error);
    }
}

/**
 * 入力文字列をデコードする関数
 * @param {string} input - URLまたはpakoパラメータ
 * @returns {string} デコードされた文字列
 */
function decodeInput(input) {
    let encodedData;

    console.log('Input:', input);

    // URLからpakoパラメータを抽出
    if (input.includes('mermaid.live/view#pako:')) {
        const match = input.match(/#pako:(.+)$/);
        if (!match) {
            throw new Error('Invalid mermaid.live URL format');
        }
        encodedData = match[1];
        console.log('Extracted from URL:', encodedData);
    }
    // pako:プレフィックスからの抽出
    else if (input.startsWith('pako:')) {
        encodedData = input.substring(5);
        console.log('Extracted from pako prefix:', encodedData);
    }
    // エンコードされた文字列そのもの
    else {
        encodedData = input;
        console.log('Using raw encoded data');
    }

    // URLデコード（URLエンコードされている場合）
    if (encodedData.includes('%')) {
        encodedData = decodeURIComponent(encodedData);
        console.log('URL decoded:', encodedData);
    }

    return pako_inflate_base64(encodedData);
}

/**
 * Base64エンコードされたdeflateされた文字列をデコードする関数
 * @param {string} str - Base64エンコードされた圧縮データ
 * @returns {string} デコードされた文字列
 */
function pako_inflate_base64(str) {
    try {
        console.log('Input string length:', str.length);

        // Base64デコード - app.jsの実装に合わせる
        const binaryString = atob(str);
        console.log('Decoded binary string length:', binaryString.length);

        // バイナリ文字列をUint8Array（バイト配列）に変換
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        console.log('Bytes array length:', bytes.length);

        // pakoを使用して解凍（inflate）
        try {
            const inflated = pako.inflate(bytes);
            console.log('Inflated data length:', inflated.length);

            // UTF-8バイト配列を文字列に変換
            return new TextDecoder().decode(inflated);
        } catch (inflateError) {
            console.error('Inflate error:', inflateError);
            throw inflateError;
        }
    } catch (error) {
        console.error('Base64 decode error:', error);
        throw error;
    }
}

// Node.js用のatob関数（ブラウザ互換）
function atob(str) {
    return Buffer.from(str, 'base64').toString('binary');
}

// テスト用のエンコード関数（app.jsのpako_deflate_base64と同じ実装）
function pako_deflate_base64(str) {
    // テキストをUTF8バイト配列に変換
    const strUtf8 = new TextEncoder().encode(str);
    // pakoを使用して圧縮
    const compressed = pako.deflate(strUtf8, { level: 9 });
    // 圧縮されたバイナリデータを文字列に変換
    const binaryStr = String.fromCharCode.apply(null, compressed);
    // Base64エンコード
    return btoa(binaryStr);
}

// Node.js用のbtoa関数（ブラウザ互換）
function btoa(str) {
    return Buffer.from(str, 'binary').toString('base64');
}