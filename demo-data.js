window.DEMO_DATA = {
  projects: [
    { id: 4105, title: 'CSV import utility', description: 'Validate incoming CSV files.<br>Keep an error report.', price: 8000, offers: 2 },
    { id: 4104, title: 'CRM webhook integration', description: 'Receive events &amp; update customer records.', price: 12000, offers: 7 },
    { id: 4103, title: 'Telegram support bot', description: 'A small support bot with a request queue.', price: 6000, offers: 12 },
    { id: 4104, title: 'CRM webhook integration', description: 'Receive events &amp; update customer records.', price: 12000, offers: 7 }
  ],
  importText: '# servers.txt\nCreative;play.example.org\nLocalhost;127.0.0.1\nCreative copy;PLAY.EXAMPLE.ORG:25565\nMods;mods.example.org',
  servers: [
    { ip: 'play.example.org', port: 25565, version: '1.21.4', protocolVersion: 769, playersOnline: 12, playersMax: 100, ping: 24, serverPlatform: 'Paper', joinStatus: 'OPEN', clientModsRequired: false, kickReason: '', mods: [] },
    { ip: 'build.example.org', port: 25565, version: '1.21.4', protocolVersion: 769, playersOnline: 4, playersMax: 30, ping: 41, serverPlatform: 'Purpur', joinStatus: 'OPEN', clientModsRequired: false, kickReason: '', mods: [] },
    { ip: 'mods.example.org', port: 25565, version: '1.20.1', protocolVersion: 763, playersOnline: 8, playersMax: 40, ping: 38, serverPlatform: 'Forge', joinStatus: 'MODS_REQUIRED', clientModsRequired: true, kickReason: 'This server has mods that require Forge to be installed on the client.', mods: [{ id: 'create', version: '0.5.1f' }, { id: 'jei', version: '15.2.0' }] },
    { ip: 'private.example.org', port: 25565, version: '1.21.4', protocolVersion: 769, playersOnline: 2, playersMax: 10, ping: 55, serverPlatform: 'Paper', joinStatus: 'WHITELIST', clientModsRequired: false, kickReason: '{"translate":"multiplayer.disconnect.not_whitelisted"}', mods: [] },
    { ip: 'online.example.org', port: 25565, version: '1.21.4', protocolVersion: 769, playersOnline: 17, playersMax: 100, ping: 30, serverPlatform: 'UNKNOWN', joinStatus: 'AUTH_FAILED', clientModsRequired: null, kickReason: 'Failed to verify username!', mods: [] },
    { ip: 'fabric.example.org', port: 25565, version: '1.21.4', protocolVersion: 769, playersOnline: 3, playersMax: 20, ping: 62, serverPlatform: 'Fabric', joinStatus: 'OPEN', clientModsRequired: null, kickReason: '', mods: [{ id: 'fabric-api', version: '0.119.4' }] },
    { ip: 'proxy.example.org', port: 25565, version: '1.21.4', protocolVersion: 769, playersOnline: 110, playersMax: 1000, ping: 18, serverPlatform: 'Velocity', joinStatus: 'AUTH_FAILED', clientModsRequired: null, kickReason: 'Authentication required', mods: [] },
    { ip: 'hidden.example.org', port: 25565, version: null, protocolVersion: null, playersOnline: null, playersMax: null, ping: null, serverPlatform: 'UNKNOWN', joinStatus: 'UNKNOWN', clientModsRequired: null, kickReason: '', mods: [] },
    { ip: 'full.example.org', port: 25565, version: '1.21.4', protocolVersion: 769, playersOnline: 20, playersMax: 20, ping: 19, serverPlatform: 'Paper', joinStatus: 'SERVER_FULL', clientModsRequired: false, kickReason: '{"translate":"multiplayer.disconnect.server_full"}', mods: [] }
  ]
};
