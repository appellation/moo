const Websocket = require('ws');
const axios = require('axios');

module.exports = class Lavalink {
  constructor(client) {
    this.client = client;
    this.ws = null;
  }

  async connectWS(url, shardCount = 1) {
    this.ws = new Websocket(url, {
      headers: {
        Authorization: 'QVrw5phMStyTKlPJOIXRe1zJYqvJrbRKn6cjea0FUEi4PY4HWi3iGqoFl7QfEDz',
        'Num-Shards': shardCount,
        'User-ID': process.env.DISCORD_ID,
      },
    });

    this.ws.on('message', m => {
      m = JSON.parse(m);

      switch (m.op) {
        case 'sendWS':
          const pk = JSON.parse(m.message);
          return this.client.send('gateway', m.shardId, pk.op, pk.d);
        case 'validationReq':
          return this.validate(m.guildId, m.channelId);
        case 'isConnectedReq':
          return this.checkConnected(m.shardId);
      }

      return undefined;
    });

    await new Promise((resolve, reject) => {
      this.ws.on('error', reject);
      this.ws.on('open', () => {
        this.ws.removeListener('error', reject);
        resolve();
      });
    });
  }

  async fetch(id) {
    const response = await axios.get('http://lavalink:3001/loadtracks', {
      params: { identifier: id },
      headers: { Authorization: 'QVrw5phMStyTKlPJOIXRe1zJYqvJrbRKn6cjea0FUEi4PY4HWi3iGqoFl7QfEDz' },
    });
    return response.data[0].track;
  }

  play(guildID, track, start, end) {
    console.log(track);
    return this.send({
      op: 'play',
      guildId: guildID,
      track,
      startTime: start,
      endTime: end,
    });
  }

  stop(guildID) {
    return this.send({
      op: 'stop',
      guildId: guildID,
    });
  }

  pause(guildID, paused = true) {
    return this.send({
      op: 'pause',
      guildId: guildID,
      pause: paused,
    });
  }

  seek(guildID, pos) {
    return this.send({
      op: 'seek',
      guildId: guildID,
      position: pos,
    });
  }

  setVolume(guildID, vol) {
    return this.send({
      op: 'volume',
      guildId: guildID,
      volume: vol,
    });
  }

  checkConnected(shard) {
    return this.send({
      op: 'isConnectedRes',
      shardId: shard,
      connected: true,
    });
  }

  async validate(guildID, channelID) {
    let valid = false;

    valid = this.client.guildChannels.has(guildID);
    if (valid && channelID && this.client.guildChannels.get(guildID).has(channelID)) {
      const [
        me,
        guild,
        channel
      ] = await Promise.all([
        this.client.guilds[guildID].members[process.env.DISCORD_ID].fetch(),
        this.client.guilds[guildID].fetch(),
        this.client.channels[channelID].fetch(),
      ]);

      let perms = guild.permissions || 0;
      for (const overwrite of channel.permission_overwrites) {
        if (
          (overwrite.type === 'user' && overwrite.id === process.env.DISCORD_ID) ||
          (overwrite.type === 'role' && me.roles.includes(overwrite.id))
        ) {
          perms &= ~overwrite.allow;
          perms |= overwrite.deny;
        }
      }

      // if perms includes connect and speak permissions
      const checks = [0x00100000, 0x00200000];
      if (checks.every(perm => perms & perm === perm)) valid = true;
    }

    return this.send({
      op: 'validationRes',
      guildId: guildID,
      channelId: channelID,
      valid,
    });
  }

  async connect(channelID, guildID) {
    if (!guildID) {
      const channel = await this.client.channels[channelID].fetch();
      guildID = channel.guild_id;
    }

    return this.send({
      op: 'connect',
      guildId: guildID,
      channelId: channelID,
    });
  }

  disconnect(guildID) {
    return this.send({
      op: 'disconnect',
      guildId: guildID,
    });
  }

  async voiceUpdate(d) {
    if (!d.guild_id) {
      const channel = await this.client.channels[d.channel_id].fetch();
      d.guild_id = channel.guild_id;
    }

    return this.send({
      op: 'voiceUpdate',
      guildId: d.guild_id,
      sessionId: d.session_id,
      event: d,
    });
  }

  send(json) {
    return this.ws.send(JSON.stringify(json));
  }
};
