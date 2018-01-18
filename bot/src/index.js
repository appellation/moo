process.on('unhandledRejection', console.error);
const { default: Spectacles } = require('@spectacles/spectacles.js');
const Lavalink = require('lavalink.js');
const handler = require('./handler');

const client = new Spectacles(process.env.DISCORD_TOKEN);
client.lava = new Lavalink(client);
client.guildChannels = new Map();
client.channelList = new Map();
client.voiceStates = new Map();

client.on('VOICE_STATE_UPDATE', async (d, ack) => {
  await client.lava.voiceUpdate(d);
  client.voiceStates.set(`${d.user_id}:${d.guild_id}`, d);
  ack();
});
client.on('MESSAGE_CREATE', (d, ack) => {
  handler(client, d);
  ack();
});
client.on('GUILD_CREATE', (d, ack) => {
  const chans = new Set(d.channels.map(c => c.id));
  client.guildChannels.set(d.id, chans);
  for (const chan of d.channels) client.channelList.set(chan.id, d.id);
  for (const state of d.voice_states) client.voiceStates.set(`${state.user_id}:${d.id}`, state);
  ack();
});
client.on('CHANNEL_CREATE', (d, ack) => {
  if (d.guild_id) client.guildChannels.get(d.guild_id).add(d.id);
  client.channelList.set(d.id, d.guild_id);
  ack();
});
client.on('CHANNEL_DELETE', (d, ack) => {
  const chans = client.guildChannels.get(d.guild_id);
  if (chans) chans.delete(d.guild_id);
  client.channelList.delete(d.id);
  ack();
});
client.on('GUILD_DELETE', (d, ack) => {
  client.guildChannels.delete(d.id);
  for (const [chan, guild] of client.channelList) if (guild === d.id) client.channelList.delete(chan);
  ack();
});

async function connect(func, ...args) {
  let connected = false;
  while (!connected) {
    try {
      await func(...args);
      connected = true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

(async () => {
  await connect(client.lava.connectWS.bind(client.lava), 'ws://lavalink:3000', (await client.rest.get('/gateway/bot')).shards);
  await connect(client.connect.bind(client), 'rabbit');
  await client.subscribe([
    'MESSAGE_CREATE',
    'VOICE_STATE_UPDATE',
    'GUILD_CREATE',
    'GUILD_DELETE',
    'CHANNEL_CREATE',
    'CHANNEL_DELETE',
  ]);
  console.log('ready');
})();
