// index.js
require('dotenv').config(); // <-- lê o .env
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// CONFIGURAÇÕES FIXAS DO SEU SERVIDOR
const SERVER_ID = "1443141817217585284";
const CANAL_VERIFICACAO = "1448880065226997963"; // Canal onde usuário clica no botão
const CANAL_FICHAS = "1448887265668370494"; // Canal onde ficha é enviada
const CARGO_VERIFICADO = "1443311857988276406";

client.on("ready", () => {
    console.log(`Bot online: ${client.user.tag}`);
});

// -------------------------------------------------------
// BOTÃO DE VERIFICAÇÃO
// -------------------------------------------------------
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "criar_ficha") {
        await interaction.reply({ content: "Envie aqui o @ da pessoa que te conhece para validar sua entrada.", ephemeral: true });

        const filter = (msg) => msg.author.id === interaction.user.id;
        const coletor = interaction.channel.createMessageCollector({ filter, max: 1, time: 20000 });

        coletor.on("collect", async (msg) => {
            const marcado = msg.mentions.users.first();
            if (!marcado) {
                return msg.reply("❌ Você precisa marcar um usuário válido.");
            }

            // Apaga a mensagem original do usuário
            await msg.delete().catch(() => {});

            // Canal onde a ficha será enviada
            const canalFicha = client.channels.cache.get(CANAL_FICHAS);

            if (!canalFicha) {
                return msg.reply("❌ O canal de fichas não foi encontrado.");
            }

            const embed = new EmbedBuilder()
                .setTitle("📄 Nova Ficha de Verificação")
                .setDescription(
                    `👤 **Usuário:** ${interaction.user}\n` +
                    `🔎 **Quem confirma:** ${marcado}\n\n` +
                    `O usuário marcado deve reagir abaixo:\n` +
                    `👍 = Conheço\n` +
                    `👎 = Não conheço`
                )
                .setColor("Blue")
                .setTimestamp();

            const mensagemFicha = await canalFicha.send({ embeds: [embed] });

            await mensagemFicha.react("👍");
            await mensagemFicha.react("👎");

            msg.reply({ content: "✅ Sua ficha foi enviada. Aguarde o usuário confirmar.", ephemeral: true });
        });
    }
});

// -------------------------------------------------------
// REAÇÃO À FICHA
// -------------------------------------------------------
client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;

    const canal = reaction.message.channel.id;

    // Apenas processa reações no canal de fichas
    if (canal !== CANAL_FICHAS) return;

    const embed = reaction.message.embeds[0];
    if (!embed) return;

    const linha_usuario = embed.description.split("\n")[0];
    const userID = linha_usuario.match(/\d+/)[0];
    const membro = reaction.message.guild.members.cache.get(userID);

    if (!membro) return;

    if (reaction.emoji.name === "👍") {
        await membro.roles.add(CARGO_VERIFICADO);
        await reaction.message.reply(`✅ ${membro} foi **verificado** e recebeu o cargo!`);
    }

    if (reaction.emoji.name === "👎") {
        await reaction.message.reply(`❌ ${membro} **não foi reconhecido** e será expulso.`);
        await membro.kick("Não foi reconhecido na verificação.");
    }
});

// -------------------------------------------------------
// LOGIN DO BOT (via .env)
client.login(process.env.BOT_TOKEN);
