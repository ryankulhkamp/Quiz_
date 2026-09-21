/**
 * Back-end do Quiz de MCU e Aceleração Centrípeta.
 *
 * Três recursos, todos guardados em um arquivo JSON simples
 * (server/dados/banco.json), que é criado sozinho na primeira vez
 * que o servidor roda:
 *   - POST /api/acessos    -> registra uma entrada na página
 *   - POST /api/resultado  -> salva o resultado de um jogador
 *   - GET  /api/ranking    -> devolve as 10 melhores pontuações
 *
 * Não usa banco de dados externo de propósito: para um projeto de
 * sala de aula, um arquivo JSON é simples de entender, de ler e de
 * resetar (basta apagar o arquivo).
 */

'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORTA = process.env.PORT || 3000;

/* ================================================================
   1. ARMAZENAMENTO EM ARQUIVO
   ================================================================ */
const PASTA_DADOS  = path.join(__dirname, 'dados');
const ARQUIVO_BANCO = path.join(PASTA_DADOS, 'banco.json');

/** Estrutura inicial do "banco" quando o arquivo ainda não existe. */
const BANCO_VAZIO = {
    acessos: [],   // { visitante, entrouEm }
    placar: {}     // visitante -> { nome, avatar, pontos, concluidoEm }
};

/** Garante que a pasta e o arquivo de dados existem. */
function prepararArmazenamento() {
    if (!fs.existsSync(PASTA_DADOS)) {
        fs.mkdirSync(PASTA_DADOS, { recursive: true });
    }
    if (!fs.existsSync(ARQUIVO_BANCO)) {
        fs.writeFileSync(ARQUIVO_BANCO, JSON.stringify(BANCO_VAZIO, null, 2));
    }
}

/** Lê o banco inteiro do disco. */
function lerBanco() {
    prepararArmazenamento();
    const texto = fs.readFileSync(ARQUIVO_BANCO, 'utf-8');
    try {
        return JSON.parse(texto);
    } catch (erro) {
        return Object.assign({}, BANCO_VAZIO);
    }
}

/** Grava o banco inteiro no disco. */
function gravarBanco(banco) {
    fs.writeFileSync(ARQUIVO_BANCO, JSON.stringify(banco, null, 2));
}

/* ================================================================
   2. CONFIGURAÇÃO DO EXPRESS
   ================================================================ */
app.use(cors());           // libera o front-end (GitHub Pages) a chamar a API
app.use(express.json());   // interpreta corpo JSON nas requisições

/* ================================================================
   3. ROTAS
   ================================================================ */

/** Registra uma entrada na página e devolve o total de acessos. */
app.post('/api/acessos', function (req, res) {
    const visitante = (req.body && req.body.visitante) || 'anonimo';
    const banco = lerBanco();

    banco.acessos.push({
        visitante: String(visitante),
        entrouEm: new Date().toISOString()
    });
    gravarBanco(banco);

    res.json({ total: banco.acessos.length });
});

/** Salva (ou atualiza) o resultado de um jogador no placar. */
app.post('/api/resultado', function (req, res) {
    const corpo = req.body || {};
    const visitante = corpo.visitante;
    const nome   = String(corpo.nome || 'Visitante').slice(0, 40);
    const avatar = String(corpo.avatar || 'orbita').slice(0, 30);
    const pontos = Number(corpo.pontos);

    if (!visitante || Number.isNaN(pontos) || pontos < 0 || pontos > 10) {
        return res.status(400).json({ erro: 'Dados de resultado inválidos.' });
    }

    const banco = lerBanco();
    banco.placar[visitante] = {
        nome: nome,
        avatar: avatar,
        pontos: pontos,
        concluidoEm: new Date().toISOString()
    };
    gravarBanco(banco);

    res.json({ ok: true });
});

/** Devolve as 10 melhores pontuações e o total de participantes. */
app.get('/api/ranking', function (req, res) {
    const banco = lerBanco();

    const lista = Object.keys(banco.placar).map(function (id) {
        const item = banco.placar[id];
        return { id: id, nome: item.nome, avatar: item.avatar, pontos: item.pontos };
    });

    lista.sort(function (a, b) {
        return b.pontos - a.pontos;
    });

    res.json({
        ranking: lista.slice(0, 10),
        participantes: lista.length
    });
});

/** Verificação simples de que o servidor está no ar. */
app.get('/api/saude', function (req, res) {
    res.json({ status: 'ok' });
});

/* ================================================================
   4. INICIALIZAÇÃO
   ================================================================ */
prepararArmazenamento();
app.listen(PORTA, function () {
    console.log('API do Quiz de MCU rodando na porta ' + PORTA);
});
