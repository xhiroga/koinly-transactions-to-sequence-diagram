/**
 * CSVがKoinlyのトランザクションデータかどうかを判定する関数
 */
function isKoinlyCSV(headers) {
    // Koinlyのトランザクションデータに特有の必須ヘッダー
    const requiredHeaders = [
        'ID',
        'Date (UTC)',
        'Type',
        'From Amount',
        'From Currency',
        'To Amount',
        'To Currency'
    ];
    
    // オプションのヘッダー（存在すればさらに確度が上がる）
    const optionalHeaders = [
        'Fee Amount',
        'Fee Currency',
        'Net Worth Amount',
        'Net Worth Currency',
        'Description'
    ];
    
    // 必須ヘッダーがすべて存在するか確認
    const hasAllRequired = requiredHeaders.every(header =>
        headers.includes(header)
    );
    
    // オプションのヘッダーが一部存在するか確認
    const optionalHeaderCount = optionalHeaders.filter(header =>
        headers.includes(header)
    ).length;
    
    // 必須ヘッダーがすべて存在し、オプションのヘッダーが少なくとも1つ存在する場合はKoinlyのCSVと判定
    return hasAllRequired && optionalHeaderCount > 0;
}

// ブラウザとNode.js環境両方で動作するようにする
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isKoinlyCSV };
} else if (typeof window !== 'undefined') {
    window.utils = window.utils || {};
    window.utils.isKoinlyCSV = isKoinlyCSV;
}