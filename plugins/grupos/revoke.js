export default {
  name: ["revokelink", "revocarlink", "resetlink"],
  description: "Revoca el link actual del grupo y genera uno nuevo",
  category: 'grupos',
  groupOnly: true,
  adminOnly: true,

  async run({ sock, from, reply }) {
    try {
      const code = await sock.groupRevokeInvite(from);
      const link = `https://chat.whatsapp.com/${code}`;

      await reply({
        text: `🔄 *Link del grupo revocado*\n\nEl link anterior ya no funciona.\n\n🔗 *Nuevo link:*\n${link}`
      });

    } catch (e) {
      await reply({
        text: "❌ No pude revocar el link del grupo."
      });
    }
  }
};