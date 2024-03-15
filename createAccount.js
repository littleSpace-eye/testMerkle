const fs = require('fs');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const ethers = require('ethers');

// 生成指定数量的以太坊地址
function generateAddresses(numAddresses) {
    const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;
    const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
    const addresses = [];

    for (let i = 0; i < numAddresses; i++) {
        const wallet = hdNode.derivePath(`m/44'/60'/0'/0/${i}`);
        addresses.push(wallet.address);
    }

    return addresses;
}

// 生成指定数量的以太坊地址并保存到CSV文件中
function generateAndSave(numAddresses, filename) {
    console.log("Generating addresses...");
    console.time("GenerationTime"); // 开始计时

    // 创建多个 worker 进程来并行生成地址
    const numWorkers = require('os').cpus().length;
    const addressesPerWorker = Math.ceil(numAddresses / numWorkers);
    const promises = [];
    for (let i = 0; i < numWorkers; i++) {
        const start = i * addressesPerWorker;
        const end = Math.min(start + addressesPerWorker, numAddresses);
        const workerData = {
            start,
            end,
            filename
        };
        const promise = new Promise((resolve, reject) => {
            const worker = new Worker(__filename, { workerData });
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0)
                    reject(new Error(`Worker stopped with exit code ${code}`));
            });
        });
        promises.push(promise);
    }

    // 等待所有 worker 进程完成并生成的地址
    Promise.all(promises).then(() => {
        console.timeEnd("GenerationTime"); // 结束计时并输出结果
        console.log("Addresses generated and saved!");
    }).catch(error => {
        console.error("Error:", error);
    });
}

// 主线程和 worker 线程的逻辑分支
if (isMainThread) {
    // 主线程
    const numberOfAddresses = 190000;
    const filename = 'ethereum_addresses.csv';
    generateAndSave(numberOfAddresses, filename);
} else {
    // worker 线程
    const { start, end, filename } = workerData;
    const addresses = generateAddresses(end - start);
    const csvContent = addresses.join('\n') + '\n';
    fs.appendFileSync(filename, csvContent);
    parentPort.postMessage('done');
}
