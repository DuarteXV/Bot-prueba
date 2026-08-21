export default {
  name: ["linkgc", "gclink", "linkgroup"],
  description: "Genera la tarjeta de invitación al grupo",
  category: "grupos",
  groupOnly: true,
  adminOnly: true,
  botAdmin: true,

  async run({ sock, from, groupMeta, reply }) {
    try {
      const metadata = groupMeta || (await sock.groupMetadata(from));
      const inviteCode = await sock.groupInviteCode(from);

      await sock.sendMessage(from, {
        groupInvite: {
          inviteCode,
          jid: from,
          subject: metadata.subject,
          inviteExpiration: Date.now() + 3 * 24 * 60 * 60 * 1000,
          text: `¡Únete a ${metadata.subject}!`
        }
      });
    } catch (e) {
      await reply({ text: `❌ No pude obtener el link del grupo:\n${e.message}` });
    }
  }
};