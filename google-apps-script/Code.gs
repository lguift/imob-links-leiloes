/**
 * Imob Links Leilões - recebimento de métricas e sugestões.
 * Execute configurarPlanilhas() como proprietário antes de implantar como Web App.
 * Implante como "Executar como: eu" e acesso "Qualquer pessoa".
 */
const TZ = 'America/Sao_Paulo';
const VISITAS_PROP = 'PLANILHA_VISITAS_ID';
const SUGESTOES_PROP = 'PLANILHA_SUGESTOES_ID';

function configurarPlanilhas() {
  const props = PropertiesService.getScriptProperties();
  const visitas = SpreadsheetApp.create('Imob Links - Métricas de visitas');
  const abaVisitas = visitas.getSheets()[0];
  abaVisitas.setName('Visitas');
  abaVisitas.appendRow(['Data e hora (São Paulo)', 'Aceitou métricas', 'Cidade aproximada', 'Estado/região', 'País', 'Origem do clique (domínio)', 'Página de entrada']);
  abaVisitas.setFrozenRows(1);
  abaVisitas.getRange(1, 1, 1, 7).setFontWeight('bold');
  visitas.setSpreadsheetTimeZone(TZ);

  const sugestoes = SpreadsheetApp.create('Imob Links - Sugestões e mensagens');
  const abaSugestoes = sugestoes.getSheets()[0];
  abaSugestoes.setName('Mensagens');
  abaSugestoes.appendRow(['Data e hora (São Paulo)', 'Mensagem']);
  abaSugestoes.setFrozenRows(1);
  abaSugestoes.getRange(1, 1, 1, 2).setFontWeight('bold');
  sugestoes.setSpreadsheetTimeZone(TZ);

  props.setProperty(VISITAS_PROP, visitas.getId());
  props.setProperty(SUGESTOES_PROP, sugestoes.getId());
  Logger.log('Planilha de visitas: ' + visitas.getUrl());
  Logger.log('Planilha de mensagens: ' + sugestoes.getUrl());
}

function doGet() {
  return resposta({ ok: true, service: 'Imob Links' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > 5000) {
      return resposta({ ok: false, error: 'invalid_request' });
    }
    const data = JSON.parse(e.postData.contents);
    lock.waitLock(5000);
    if (data.tipo === 'visita') {
      if (data.consentimento !== true) return resposta({ ok: false, error: 'consent_required' });
      const id = PropertiesService.getScriptProperties().getProperty(VISITAS_PROP);
      if (!id) return resposta({ ok: false, error: 'setup_required' });
      const sheet = SpreadsheetApp.openById(id).getSheets()[0];
      const agora = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([
        agora, 'Sim', texto(data.cidade, 80), texto(data.regiao, 80),
        texto(data.pais, 80), texto(data.origem, 120), texto(data.pagina, 120)
      ]);
      return resposta({ ok: true });
    }
    if (data.tipo === 'sugestao') {
      if (String(data.site || '').trim()) return resposta({ ok: true }); // honeypot
      const mensagem = texto(data.mensagem, 3000).trim();
      if (mensagem.length < 3) return resposta({ ok: false, error: 'message_required' });
      const id = PropertiesService.getScriptProperties().getProperty(SUGESTOES_PROP);
      if (!id) return resposta({ ok: false, error: 'setup_required' });
      const sheet = SpreadsheetApp.openById(id).getSheets()[0];
      const agora = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([agora, mensagem]);
      return resposta({ ok: true });
    }
    return resposta({ ok: false, error: 'unknown_type' });
  } catch (err) {
    return resposta({ ok: false, error: 'server_error' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function texto(value, limite) {
  return String(value || '').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, limite);
}

function resposta(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
