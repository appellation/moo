const { default: Gateway } = require('@spectacles/gateway');
const client = new Gateway({
  token: process.env.DISCORD_TOKEN,
  events: [
    'MESSAGE_CREATE',
    'VOICE_STATE_UPDATE',
    'GUILD_CREATE',
    'GUILD_DELETE',
    'CHANNEL_CREATE',
    'CHANNEL_DELETE',
  ],
  reconnect: false,
});

client.on('error', (e) => {
  console.log(e);
  for (const conn of client.connections) conn.reconnect();
});

(async () => {
  let connected = false;
  while (!connected) {
    try {
      await client.connect('rabbit');
      connected = true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  await client.spawn();
  console.log('ready');
})();
