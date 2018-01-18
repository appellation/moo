const YouTube = require('simple-youtube-api');
const yt = new YouTube(process.env.GOOGLE);

module.exports = async (client, message) => {
  const guild = client.channelList.get(message.channel_id);
  if (!guild || !message.content.startsWith(',')) return;

  const args = message.content.replace(/^,\s*/, '').split(' ');
  const cmd = args.shift();
  const body = args.join(' ');
  switch (cmd) {
    case 'play': {
      const url = YouTube.util.parseURL(body);
      let id = url.video || url.playlist;
      if (!id) {
        const searches = await yt.searchVideos(body, 1);
        if (searches.length) id = searches[0].id;
        else return;
      }

      const state = client.voiceStates.get(`${process.env.DISCORD_ID}:${guild}`);
      if (!state) {
        const authorState = client.voiceStates.get(`${message.author.id}:${guild}`);
        if (!authorState) return;
        await client.lava.connect(authorState.channel_id, authorState.guild_id);
      }

      const track = await client.lava.fetch(id);
      if (track) client.lava.play(guild, track);
    }
  }
};
