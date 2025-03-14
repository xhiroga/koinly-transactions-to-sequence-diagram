# Koinly Transactions to Sequence Diagram

A web-based tool that converts your Koinly transaction history into interactive sequence diagrams, helping you visualize cryptocurrency flows between exchanges and wallets.

## Features

- **Easy Data Import**: Upload your Koinly CSV export file or paste the data directly
- **Customizable Visualization**: Filter by currencies and adjust display options
- **Aggregation Options**: Group transactions by day, month, or year
- **Offset Feature**: Automatically detect and offset reverse transactions within periods
- **Export Options**: Download as SVG or open in Mermaid Live Editor
- **Multilingual Support**: Available in English and Japanese

## How to Use

1. **Import Your Data**
   - Export your transaction history from Koinly as a CSV file
   - Upload the file or paste the CSV content directly into the tool

2. **Configure Display Options**
   - Select which currencies to include in the diagram
   - Choose how to aggregate transactions (by day, month, year, or no aggregation)
   - Optionally enable offsetting of reverse transactions

3. **Generate and Export**
   - Generate your sequence diagram
   - Download as SVG or open in Mermaid Live Editor for further customization

## Why Use This Tool?

Koinly provides excellent tax reporting, but understanding the flow of your assets between different platforms can be challenging. This tool transforms your transaction data into visual sequence diagrams that make it easy to:

- Track how your assets move between exchanges and wallets
- Identify patterns in your trading behavior
- Visualize the timeline of your cryptocurrency journey
- Share your transaction flow with others

## Privacy Notice

This tool runs entirely in your browser. Your transaction data never leaves your computer, ensuring your financial information remains private and secure.

## Development

```shell
fnm use
pnpm i
pnpm test
```

## License

This project is open source and available under the MIT License.

## Acknowledgements

- Built with [Mermaid.js](https://mermaid.js.org/) for sequence diagram generation
- Uses [Pako](https://github.com/nodeca/pako) for data compression when sharing to Mermaid Live Editor

---

Created by [@xhiroga](https://github.com/xhiroga) with Roo Code 🚀
