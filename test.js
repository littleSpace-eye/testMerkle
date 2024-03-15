const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const fs = require('fs');
const csvParser = require('csv-parser');

// 开始计时
console.time('TotalTime1');

const values = [];

fs.createReadStream('whitelist.csv')
  .pipe(csvParser())
  .on('data', (data) => {
    values.push([data.Address]);
  })
  .on('end', () => {
    console.log(values);
    // 构建 Merkle 树前开始计时
    console.time('MerkleTreeConstructionTime');

    const tree = StandardMerkleTree.of(values, ["address"]);

    // 构建 Merkle 树后结束计时并输出根哈希
    console.timeEnd('MerkleTreeConstructionTime');
    console.log('Merkle Root:', tree.root);

    // 将 Merkle 树的结构保存到 JSON 文件中
    fs.writeFileSync("whitelist_tree.json", JSON.stringify(tree.dump()));

    // 从 JSON 文件中加载 Merkle 树
    //const tree2 = StandardMerkleTree.load(JSON.parse(fs.readFileSync("whitelist_tree.json").toString()));

    // 遍历 Merkle 树中的地址，并生成 SQL 脚本
    const sqlScript = generateSqlScript(tree);

    // 将 SQL 脚本保存到文件中
    fs.writeFileSync("whitelist.sql", sqlScript);
    console.log("SQL scri pt generated and saved to whitelist.sql");

    // 结束总计时
    console.timeEnd('TotalTime');
  });

function generateSqlScript(tree) {
  let sqlScript = '';
  for (const [i, v] of tree.entries()) {
    const proof = tree.getProof(i);
    sqlScript += `INSERT INTO whitelist (address, proof) VALUES ('${v[0]}', '${JSON.stringify(proof)}');\n`;
  }
  return sqlScript;
}
