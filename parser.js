const date = require('date-and-time');
const xlsx = require('node-xlsx');

const filename = 'Test.xlsx';
//const filename = 'JoinedTransactions.xlsx';
const year = 2020;



console.log('##################################')
console.log(`# Reading file ${filename}`)
console.log('##################################')
// Parse a file
const workSheetsFromFile = xlsx.parse(`${__dirname}/${filename}`, { cellDates: true });

console.log(`---- File contains ${workSheetsFromFile.length} pages`)

workSheetsFromFile.forEach(page => {
    console.log(`---- Page  ${page.name}`)

    const stocks = getStocksMovements(page.data)

    const IRSLines = getIRSLines(stocks);


    console.log('---------------- IRSLines --------------')
    IRSLines.forEach(irsline => {
        console.log('---------------------')
        console.log(irsline.name)
        irsline.sellGains.forEach( sellGain => {

            console.log(sellGain)
        })
    })
})


function getIRSLines(stocks) {
    let IRSLines = []
    let index = 951;

    stocks.forEach( stock => {
        const stockGains = {'name': stock.name, 'sellGains': []}

        stock.sell.forEach( sell => {
                const sellGains = getSellGains(sell,stock.buy, index)


                if ( sell.Data.getFullYear() == year) {
                    if (sellGains.length) {

                        stockGains.sellGains = stockGains.sellGains.concat(sellGains)
                        index = index + sellGains.length;
                    }
                }

        })
        if (stockGains.sellGains.length) {
            IRSLines.push(stockGains)
        }
    });

    return IRSLines;
}

function getSellGains(sell,buy, index) {
    const sellGains = [];

    buy.forEach( buy => {

        if (sell.RemainQuantidade == 0 || buy.RemainQuantidade == 0) {
            // All sold shares are accounted for
            return;
        }

        if (buy.Data < sell.Data || (buy.Data == sell.Data && buy.Hora < sell.DaHorata)) {
            let quantityToCal = 0;

            if ( buy.Quantidade < sell.RemainQuantidade) {
                quantityToCal = buy.Quantidade;
            }
            if ( buy.Quantidade > sell.RemainQuantidade) {
                quantityToCal = sell.RemainQuantidade;
            }
            if ( buy.Quantidade == sell.RemainQuantidade) {
                quantityToCal = sell.RemainQuantidade;
            }


            let sellExpense = sell['Custos de transa????o'] ? Math.abs(sell['Custos de transa????o']) : 0;
            let buyExpense = buy['Custos de transa????o'] ?  Math.abs(buy['Custos de transa????o']) : 0;



            const sellGain = {
                'Numero': index,
                'Realiza??ao': {
                    'Ano': sell.Data.getFullYear(),
                    'Mes': sell.Data.getMonth()+1,
                    'Valor': Math.abs( (sell.Valor/sell.Quantidade ) * quantityToCal)
                },
                'Aquisi????o': {
                    'Ano': buy.Data.getFullYear(),
                    'Mes': buy.Data.getMonth()+1,
                    'Valor':  Math.abs( (buy.Valor/buy.Quantidade ) * quantityToCal )
                },
                'Despesas e Encargos': sellExpense+buyExpense
            };

            sellGains.push(sellGain);

            sell.RemainQuantidade = sell.RemainQuantidade-quantityToCal;
            buy.RemainQuantidade = buy.RemainQuantidade-quantityToCal;

            buy['Custos de transa????o'] = buy['Custos de transa????o'] - buy['Custos de transa????o'];
            sell['Custos de transa????o'] = sell['Custos de transa????o'] - sell['Custos de transa????o'];
            index++
        }


    })

    return sellGains;
}


function getParsedLine(header, line)  {
    const parsedline = {};
    header.forEach( (head, index) => {
        if (head ) {

            if (typeof(line[index]) == 'string') {
                number = parseFloat( line[index].replace(',', '.'))


                if (date.isValid(line[index], 'DD-MM-YYYY') ) {
                    parsedline[head] = date.parse(line[index], 'DD-MM-YYYY');
                } else if (number) {
                    parsedline[head] = number
                } else {
                    parsedline[head] = line[index]
                }
            } else {
                parsedline[head] = line[index]

            }




        }
    });


    return parsedline;
}

function getStocksMovements(data) {

    const header =  data[0]
    const headIndex = {};
    header.forEach( (head, index) => {
        if (head) {
            headIndex[head] = index;
        }
    });


    const lines = data.slice(1)


    const stocks = [];
    lines.forEach(line => {
        if (line.length) {
            const parsedline = getParsedLine(header, line);
            let stock = stocks.find( stock => stock.name == parsedline.Produto)
            if (!stock) {
                stock = {'name': parsedline.Produto, 'sell': [], 'buy': []};
                stocks.push(stock);
            }

            parsedline.RemainQuantidade = Math.abs(parsedline.Quantidade);


            if (parsedline.Valor > 0 ) {
                stock.sell.push(parsedline)
            } else {
                stock.buy.push(parsedline)
            }

        }
    })

    stocks.forEach(stock => {
        stock.buy = stock.buy.sort( (a,b) => a > b ? -11 : 1)
        stock.sell = stock.sell.sort( (a,b) => a > b ? -1 : 1)
    })

    return stocks;
}
