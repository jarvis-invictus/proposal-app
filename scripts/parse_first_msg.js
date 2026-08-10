const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('/Users/sahilbagul/.gemini/antigravity/brain/17ce04fd-b0f2-4407-a4bb-652a6e40c183/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const obj = JSON.parse(line);
    if (obj.type === 'USER_INPUT') {
      fs.writeFileSync('scripts/first_msg.txt', obj.content);
      console.log('Saved to scripts/first_msg.txt');
      break;
    }
  }
}
run();
