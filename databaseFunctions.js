const fs = require('fs');
const path = require('path');

const DATABASE_FILE_RELOGGIN = 'relogginDB.json';

function readJSONFile(filename) {
  try {
    const data = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

function writeJSONFile(filename, data) {
  try {
    fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
  }
}

function addReloggin(sessionid, reconnect) {
  const relogginData = readJSONFile(DATABASE_FILE_RELOGGIN);

  const existingEntry = relogginData.find(entry => entry.sessionid === sessionid);
  if (existingEntry) {
    throw new Error('A entrada para esta sessão já existe no banco de dados.');
  }

  const newEntry = { sessionid, reconnect };
  relogginData.push(newEntry);
  writeJSONFile(DATABASE_FILE_RELOGGIN, relogginData);
}

function readReloggin(sessionid) {
  const relogginData = readJSONFile(DATABASE_FILE_RELOGGIN);
  const entry = relogginData.find(entry => entry.sessionid === sessionid);
  return entry ? entry.reconnect : undefined;
}

function updateReloggin(sessionid, reconnect) {
  const relogginData = readJSONFile(DATABASE_FILE_RELOGGIN);
  const entryIndex = relogginData.findIndex(entry => entry.sessionid === sessionid);
  if (entryIndex !== -1) {
    relogginData[entryIndex].reconnect = reconnect;
    writeJSONFile(DATABASE_FILE_RELOGGIN, relogginData);
  }
}

function deleteReloggin(sessionid) {
  const relogginData = readJSONFile(DATABASE_FILE_RELOGGIN);
  const updatedData = relogginData.filter(entry => entry.sessionid !== sessionid);
  writeJSONFile(DATABASE_FILE_RELOGGIN, updatedData);
}

function existsReloggin(sessionid) {
  const relogginData = readJSONFile(DATABASE_FILE_RELOGGIN);
  return relogginData.some(entry => entry.sessionid === sessionid);
}

//Rotinas da gestão de dados

function readJSONFile(nomeArquivo) {
    if (fs.existsSync(nomeArquivo)) {
      const dados = fs.readFileSync(nomeArquivo);
      return JSON.parse(dados);
    } else {
      return [];
    }
  }
  
  function writeJSONFile(nomeArquivo, dados) {
    const dadosJSON = JSON.stringify(dados, null, 2);
    fs.writeFileSync(nomeArquivo, dadosJSON);
  }
  
  // Dados do sistema
  
  const DATABASE_FILE_SYSTEM = 'typeSystemDB.json';

  function initializeDBSystem() {
    // Verifica se o arquivo do banco de dados já existe
    if (!fs.existsSync(DATABASE_FILE_SYSTEM)) {
      // Se não existir, inicializa com dados de exemplo
      const initialConfigs = {};
  
      writeJSONFile(DATABASE_FILE_SYSTEM, initialConfigs);
      console.log('Banco de dados do sistema inicializado com dados de exemplo.');
    } else {
      // Se já existir, mantém os dados existentes
      console.log('Banco de dados do sistema já existe e não será sobrescrito.');
    }
  }
  
  function readMapSystem(instanceName) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SYSTEM);
    return dadosAtuais[instanceName] || null;
  }
  
  function addObjectSystem(instanceName, url_chat, openaikey, elevenlabskey, apiKeyEVO) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SYSTEM);
  
    if (dadosAtuais[instanceName]) {
        throw new Error('A instância já existe no banco de dados.');
    }
  
    const objeto = { url_chat, openaikey, elevenlabskey, apiKeyEVO };
    dadosAtuais[instanceName] = objeto;    
    
    writeJSONFile(DATABASE_FILE_SYSTEM, dadosAtuais);
    
  }
  
  function readInstance(instanceName) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SYSTEM);
    const objeto = dadosAtuais[instanceName];
    if (!objeto) {
      console.error('Instância não encontrada.');
      return null;
    }
    return objeto;
  }
  
  function updateObjectSystem(instanceName, url_chat, openaikey, elevenlabskey, apiKeyEVO) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SYSTEM);
    const objeto = dadosAtuais[instanceName];
  
    if (!objeto) {
      throw new Error('Instância não encontrada.');
    }
  
    objeto.url_chat = url_chat;
    objeto.openaikey = openaikey;
    objeto.elevenlabskey = elevenlabskey;
    objeto.apiKeyEVO = apiKeyEVO;
  
    writeJSONFile(DATABASE_FILE_SYSTEM, dadosAtuais);
  }
  
  function deleteObjectSystem(instanceName) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SYSTEM);
    if (!dadosAtuais[instanceName]) {
      throw new Error('Instância não encontrada.');
    }
    delete dadosAtuais[instanceName];
    writeJSONFile(DATABASE_FILE_SYSTEM, dadosAtuais);
  }
  
  function existsDBSystem(instanceName) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SYSTEM);
    return !!dadosAtuais[instanceName];
  }
  
  function existsTheDBSystem() {
    if (!fs.existsSync(DATABASE_FILE_SYSTEM)) {
      return false;
    }
  
    const dadosAtuais = readJSONFile(DATABASE_FILE_SYSTEM);
  
    if (Object.keys(dadosAtuais).length === 0) {
      return false;
    }
  
    return true;
  }

  function readInstanceURL(instanceName) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SYSTEM);
    const objeto = dadosAtuais[instanceName];
  
    if (!objeto) {
      console.error('Instância não encontrada.');
      return null;
    }
  
    // Retorna a URL e as chaves correspondentes à instância fornecida
    return {
      url_chat: objeto.url_chat,
      openaikey: objeto.openaikey,
      elevenlabskey: objeto.elevenlabskey,
      apiKeyEVO: objeto.apiKeyEVO
    };
  }
  
  // Fim dos dados do sistema
  
  //Gestão de dados do controle das sessões

const DATABASE_FILE = "typesessaodb.json";
  
function addObject(numeroId, sessionid, numero, id, interact, fluxo, optout, flow, nextAudio, nextImage, prompt, delay, caption, instanceName, maxObjects) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
  
    // Verificar a unicidade do numeroId
    const existeNumeroId = dadosAtuais.some(objeto => objeto.numeroId === numeroId);
    if (existeNumeroId) {
      throw new Error('O numeroId já existe no banco de dados.');
    }
  
    const objeto = { numeroId, sessionid, numero, id, interact, fluxo, optout, flow, nextAudio, nextImage, prompt, delay, caption, instanceName};
  
    if (dadosAtuais.length >= maxObjects) {
      // Excluir o objeto mais antigo
      dadosAtuais.shift();
    }
  
    dadosAtuais.push(objeto);
    writeJSONFile(DATABASE_FILE, dadosAtuais);
}
  
function readMap(numeroId) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    return objeto;
}
  
function deleteObject(numeroId) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const novosDados = dadosAtuais.filter(obj => obj.numeroId !== numeroId);
    writeJSONFile(DATABASE_FILE, novosDados);
}
  
function existsDB(numeroId) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    return dadosAtuais.some(obj => obj.numeroId === numeroId);
}
  
function updatePrompt(numeroId, prompt) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.prompt = prompt;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}  
  
function readPrompt(numeroId) {
    const objeto = readMap(numeroId);
    return objeto ? objeto.prompt : undefined;
}

function updateDelay(numeroId, delay) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.delay = delay;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}  
  
function readDelay(numeroId) {
    const objeto = readMap(numeroId);
    return objeto ? objeto.delay : undefined;
}

function updateCaption(numeroId, caption) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.caption = caption;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}  
  
function readCaption(numeroId) {
    const objeto = readMap(numeroId);
    return objeto ? objeto.caption : undefined;
}
  
function updateNextAudio(numeroId, nextAudio) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.nextAudio = nextAudio;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}  
  
function readNextAudio(numeroId) {
    const objeto = readMap(numeroId);
    return objeto ? objeto.nextAudio : undefined;
}
  
function updateNextImage(numeroId, nextImage) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.nextImage = nextImage;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}  
  
function readNextImage(numeroId) {
    const objeto = readMap(numeroId);
    return objeto ? objeto.nextImage : undefined;
}
  
function updateSessionId(numeroId, sessionid) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.sessionid = sessionid;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}
  
function readSessionId(numeroId) {
    const objeto = readMap(numeroId);
    return objeto ? objeto.sessionid : undefined;
}
  
function updateId(numeroId, id) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.id = id;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}  
  
function readId(numeroId) {
    const objeto = readMap(numeroId);
    return objeto ? objeto.id : undefined;
}
  
function updateInteract(numeroId, interact) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.interact = interact;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}
  
function readInteract(numeroId) {
    const objeto = readMap(numeroId);
    return objeto ? objeto.interact : undefined;
}
  
function updateFluxo(numeroId, fluxo) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.fluxo = fluxo;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}
  
function readFluxo(numeroId) {
      if (!existsDB(numeroId)) {     
        return undefined;
    }
    const objeto = readMap(numeroId);
    return objeto ? objeto.fluxo : undefined;
}
  
function updateOptout(numeroId, optout) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.optout = optout;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}
  
function readOptout(numeroId) {
      if (!existsDB(numeroId)) {     
        return undefined;
    }
    const objeto = readMap(numeroId);
    return objeto ? objeto.optout : undefined;
}
  
function updateFlow(numeroId, flow) {
    const dadosAtuais = readJSONFile(DATABASE_FILE);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.flow = flow;
      writeJSONFile(DATABASE_FILE, dadosAtuais);
    }
}
  
function readFlow(numeroId) {
      if (!existsDB(numeroId)) {     
        return undefined;
    }
    const objeto = readMap(numeroId);
    return objeto ? objeto.flow : undefined;
}

function updateinstanceName(numeroId, instanceName) {
  const dadosAtuais = readJSONFile(DATABASE_FILE);
  const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
  if (objeto) {
    objeto.instanceName = instanceName;
    writeJSONFile(DATABASE_FILE, dadosAtuais);
  }
}  

function readinstanceName(numeroId) {
  const objeto = readMap(numeroId);
  return objeto ? objeto.instanceName : undefined;
}
  
//Fim das rotinas do banco de dados de gestão das sessões
  
const DATABASE_FILE_TYPE = 'typebotDB.json';
  
function initializeDB() {
    // Verifica se o arquivo do banco de dados já existe
    if (!fs.existsSync(DATABASE_FILE_TYPE)) {
        // Se não existir, inicializa com os dados de typebotConfigs
        const typebotConfigs = {
            typebot1: {
                url_registro: 'https://seutypebot/api/v1/typebots/funil-base-f8uqcdj/startChat',      
                gatilho: "gatilho do seu fluxo",
                name: "nomedofluxo"
            }
        };
  
        const db = {};
        Object.values(typebotConfigs).forEach(config => {
            db[config.name] = config;
        });
  
        writeJSONFile(DATABASE_FILE_TYPE, db);
    } else {
        // Se já existir, mantém os dados existentes
        console.log('Banco de dados principal já existe e não será sobrescrito.');
    }
}
  
function addToDB(config) {
      const db = readJSONFile(DATABASE_FILE_TYPE);
      db[config.name] = config;
      writeJSONFile(DATABASE_FILE_TYPE, db);
}
  
function removeFromDB(name) {
      const db = readJSONFile(DATABASE_FILE_TYPE);
      delete db[name];
      writeJSONFile(DATABASE_FILE_TYPE, db);
}
  
function updateDB(name, newConfig) {
      const db = readJSONFile(DATABASE_FILE_TYPE);
      if (db[name]) {
          db[name] = newConfig;
          writeJSONFile(DATABASE_FILE_TYPE, db);
      }
}
  
function readFromDB(name) {
      const db = readJSONFile(DATABASE_FILE_TYPE);
      return db[name];
}
  
function listAllFromDB() {
      return readJSONFile(DATABASE_FILE_TYPE);
}
  
function findURLByNameV1(name) {
    const db = readJSONFile(DATABASE_FILE_TYPE);
    
    // Procura por uma entrada no banco de dados que corresponda ao nome fornecido
    const entry = db[name];
  
    // Retorna a URL se uma entrada correspondente for encontrada
    return entry ? entry.url_registro : null;
}
  
// Inicio das rotinas do banco de dados para guardar multiplos fluxos de Typebot
  
const DATABASE_FILE_SELF = 'typeconfigsdb.json';
  
function salvarNoJSONSelf(nomeArquivo, numeroId) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
  
    // Encontrar o objeto com o número de ID correspondente
    const objetoEncontrado = dadosAtuais.find(objeto => objeto.numeroId === numeroId);
  
    if (!objetoEncontrado) {
      throw new Error('Não foi encontrado um objeto com o numeroId fornecido.');
    }
  
    // Verificar se o nome do arquivo foi fornecido
    if (!nomeArquivo) {
      throw new Error('É necessário fornecer um nome de arquivo.');
    }
  
    // Adicionar a extensão .json ao nome do arquivo, se necessário
    if (!nomeArquivo.endsWith('.json')) {
      nomeArquivo += '.json';
    }
  
    let objetosExistente = [];
    if (fs.existsSync(nomeArquivo)) {
      // Se o arquivo já existe, ler os objetos existentes
      const arquivoExistente = fs.readFileSync(nomeArquivo, 'utf-8');
      objetosExistente = JSON.parse(arquivoExistente);
    }
  
    // Adicionar o objeto encontrado ao array de objetos existentes
    objetosExistente.push(objetoEncontrado);
  
    // Salvar os objetos no arquivo JSON
    fs.writeFileSync(nomeArquivo, JSON.stringify(objetosExistente, null, 2));
}
  
function addObjectSelf(numeroId, flowState, id, interact, urlregistro, gatilho, name) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
  
    // Verificar a unicidade do numeroId
    const existeNumeroId = dadosAtuais.some(objeto => objeto.numeroId === numeroId);
    if (existeNumeroId) {
      throw new Error('O numeroId já existe no banco de dados - Central de Controle.');
    }
  
    const objeto = { numeroId, flowState, id, interact, urlregistro, gatilho, name};
  
    dadosAtuais.push(objeto);
    writeJSONFile(DATABASE_FILE_SELF, dadosAtuais);
}
  
function deleteObjectSelf(numeroId) {
  const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
  const novosDados = dadosAtuais.filter(obj => obj.numeroId !== numeroId);
  writeJSONFile(DATABASE_FILE_SELF, novosDados);
}
  
function existsDBSelf(numeroId) {
  const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
  return dadosAtuais.some(obj => obj.numeroId === numeroId);
}
  
function updateFlowSelf(numeroId, flowState) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.flowState = flowState;
      writeJSONFile(DATABASE_FILE_SELF, dadosAtuais);
    }
}
  
function readFlowSelf(numeroId) {
    const objeto = readMapSelf(numeroId);
    return objeto ? objeto.flowState : undefined;
}
  
function updateIdSelf(numeroId, id) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.id = id;
      writeJSONFile(DATABASE_FILE_SELF, dadosAtuais);
    }
}
  
function readIdSelf(numeroId) {
    const objeto = readMapSelf(numeroId);
    return objeto ? objeto.id : undefined;
}
  
function updateInteractSelf(numeroId, interact) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.interact = interact;
      writeJSONFile(DATABASE_FILE_SELF, dadosAtuais);
    }
}
  
function readInteractSelf(numeroId) {
    const objeto = readMapSelf(numeroId);
    return objeto ? objeto.interact : undefined;
}
  
function updateURLRegistro(numeroId, urlregistro) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.urlregistro = urlregistro;
      writeJSONFile(DATABASE_FILE_SELF, dadosAtuais);
    }
}
  
function readURLRegistro(numeroId) {
    const objeto = readMapSelf(numeroId);
    return objeto ? objeto.urlregistro : undefined;
}
  
function updateGatilho(numeroId, gatilho) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.gatilho = gatilho;
      writeJSONFile(DATABASE_FILE_SELF, dadosAtuais);
    }
}
  
function readGatilho(numeroId) {
    const objeto = readMapSelf(numeroId);
    return objeto ? objeto.gatilho : undefined;
}
  
function updateName(numeroId, name) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    if (objeto) {
      objeto.name = name;
      writeJSONFile(DATABASE_FILE_SELF, dadosAtuais);
    }
}
  
function readName(numeroId) {
    const objeto = readMapSelf(numeroId);
    return objeto ? objeto.name : undefined;
}
  
function readMapSelf(numeroId) {
    const dadosAtuais = readJSONFile(DATABASE_FILE_SELF);
    const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
    return objeto;
}
  
// Fim das rotinas do banco de dados para guardar multiplos fluxos de Typebot
  
// Inicio das rotinas de cadastro de respostas rápidas
  
const DATABASE_FILE_TYPEBOT_V2 = 'typebotDBV2.json';
  
function initializeDBTypebotV2() {
    // Verifica se o arquivo do banco de dados já existe
    if (!fs.existsSync(DATABASE_FILE_TYPEBOT_V2)) {
        // Se não existir, inicializa com um objeto vazio
        const db = {};
        writeJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2, db);
    } else {
        // Se já existir, mantém os dados existentes
        console.log('Banco de dados V2 já existe e não será sobrescrito.');
    }
}
  
function addToDBTypebotV2(name, config) {
      const db = readJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2);
      db[name] = config;
      writeJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2, db);
}
  
function removeFromDBTypebotV2(name) {
      const db = readJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2);
      delete db[name];
      writeJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2, db);
}
  
function updateDBTypebotV2(name, newConfig) {
      const db = readJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2);
      if (db[name]) {
          db[name] = newConfig;
          writeJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2, db);
      }
}
  
function readFromDBTypebotV2(name) {
      const db = readJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2);
      return db[name];
}
  
function findFlowNameByTriggerV2(trigger) {
    const db = readJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2);
    
    // Procura por uma entrada no banco de dados que corresponda ao gatilho fornecido
    const entry = Object.entries(db).find(([key, value]) => value.gatilho === trigger);
  
    // Retorna o nome do fluxo se uma entrada correspondente for encontrada
    return entry ? entry[1].name : null;
}
  
function listAllFromDBTypebotV2() {
      return readJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2);
}
  
function readJSONFileTypebotV2(filename) {
      try {
          return JSON.parse(fs.readFileSync(filename, 'utf8'));
      } catch (error) {
          return {};
      }
}
  
function writeJSONFileTypebotV2(filename, data) {
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

// Inicio das rotinas de disparo do remarketing

const DATABASE_FILE_TYPEBOT_V3 = 'typebotDBV3.json';

function initializeDBTypebotV3() {
  // Verifica se o arquivo do banco de dados já existe
  if (!fs.existsSync(DATABASE_FILE_TYPEBOT_V3)) {
      // Se não existir, inicializa com um objeto vazio
      const db = {};
      writeJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3, db);
  } else {
      // Se já existir, mantém os dados existentes
      console.log('Banco de dados V3 já existe e não será sobrescrito.');
  }
}

function addToDBTypebotV3(url, disparoConfig) {
  const db = readJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3);
  
  // Adiciona ao banco de dados
  db[url] = {
      ...disparoConfig,
      url_registro: url,
      disparo: disparoConfig.disparo // Converte a data futura para string ISO
  };

  writeJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3, db);
}

function removeFromDBTypebotV3(url) {
    const db = readJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3);
    delete db[url];
    writeJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3, db);
}

function updateDBTypebotV3(url, newDisparoConfig) {
    const db = readJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3);
    if (db[url]) {
        db[url] = {
            ...newDisparoConfig,
            disparo: newDisparoConfig.disparo.toISOString()  // Garante que a data é uma string
        };
        writeJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3, db);
    }
}

function readFromDBTypebotV3(url) {
    const db = readJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3);
    const config = db[url];
    if (config && config.disparo) {
        config.disparo = new Date(config.disparo);  // Reconverte a string para um objeto Date
    }
    return config;
}

function listAllFromDBTypebotV3() {
    const db = readJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3);
    Object.keys(db).forEach(key => {
        if (db[key].disparo) {
            db[key].disparo = new Date(db[key].disparo);  // Reconverte as strings para objetos Date
        }
    });
    return db;
}

function readJSONFileTypebotV3(filename) {
    try {
        return JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (error) {
        return {};
    }
}

function writeJSONFileTypebotV3(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

// Fim das rotinas de disparo do remarketing

// Inicio das rotinas de disparo de Remarketing Agendados

const DATABASE_FILE_TYPEBOT_V4 = 'typebotDBV4.json';

function scheduleAction(dataFutura, url, name, datafrom, messageId, instanceName, apiKeyEVO) {
  const agora = new Date();
  const delay = dataFutura.getTime() - agora.getTime(); // Calcula o tempo de espera em milissegundos

  if (delay <= 0) {
      console.log("A data de disparo já passou. Executando agora.");
      if(!readOptout(datafrom)){
      deleteObject(datafrom);
      processMessageRMKT(datafrom, messageId, url, name, instanceName, apiKeyEVO);
      removeFromDBTypebotV4withNumberAndURL(datafrom, url);
      }
  } else {
      console.log(`Agendando ação de remarketing para ${dataFutura} (URL: ${url})`);
      
      // Agendar a ação
      setTimeout(() => {
          if(!readOptout(datafrom)){
          deleteObject(datafrom);          
          processMessageRMKT(datafrom, messageId, url, name, instanceName, apiKeyEVO);
          removeFromDBTypebotV4withNumberAndURL(datafrom, url);
          }
      }, delay);

      // Registrar no banco de dados V4
      const agendamentoConfig = {
          url_registro: url,
          dataAgendamento: dataFutura,
          name: name,
          messageId: messageId,
          instanceName: instanceName,
          apiKeyEVO: apiKeyEVO
      };
      
      console.log(`Agendamento registrado para: ${datafrom} - URL: ${url} - Data: ${dataFutura}`);
  }
}

async function processMessageRMKT(datafrom, messageId, url, name, instanceName, apiKeyEVO) {
  const typebotConfigsV3 = readJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3); // Lê os dados do banco de dados V3

  // Busca a configuração correspondente à URL fornecida
  const typebotConfigV3 = typebotConfigsV3[url];

  if (typebotConfigV3) {
      // Se encontrou o registro, executa a adição da sessão
      deleteObject(datafrom);
      await createSessionJohnny(datafrom, messageId, url, name, instanceName, apiKeyEVO);
  } else {
      console.log(`Nenhuma configuração encontrada para a URL: ${url}`);
  }
}

async function initializeDBTypebotV4() {
  if (!fs.existsSync(DATABASE_FILE_TYPEBOT_V4)) {
    const db = {};
    writeJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4, db);
  } else {
    const db = readJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4);

    for (const whatsappNumber in db) {
      if (db.hasOwnProperty(whatsappNumber)) {
        db[whatsappNumber].forEach(agendamentoConfig => {
          const dataAgendamento = new Date(agendamentoConfig.dataAgendamento);
          if (dataAgendamento > new Date()) {
            // Chama scheduleAction diretamente para cada agendamento
            scheduleAction(dataAgendamento, agendamentoConfig.url_registro, agendamentoConfig.name, whatsappNumber, agendamentoConfig.messageId, agendamentoConfig.instanceName, agendamentoConfig.apiKeyEVO);
          }
        });
      }
    }
  }
}

// Supõe-se que as funções scheduleAction, writeJSONFileTypebotV4 e readJSONFileTypebotV4 estejam definidas

function addToDBTypebotV4(whatsappNumber, agendamentoConfig) {
  const db = readJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4);
  if (!db[whatsappNumber]) {
    db[whatsappNumber] = [];
  }
  db[whatsappNumber].push({
    ...agendamentoConfig,
    dataAgendamento: agendamentoConfig.dataAgendamento.toISOString()
  });
  writeJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4, db);
}

function updateDBTypebotV4(whatsappNumber, url, newAgendamentoConfig) {
  const db = readJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4);
  if (db[whatsappNumber]) {
    const index = db[whatsappNumber].findIndex(config => config.url_registro === url);
    if (index !== -1) {
      db[whatsappNumber][index] = {
        ...newAgendamentoConfig,
        dataAgendamento: newAgendamentoConfig.dataAgendamento.toISOString()
      };
      writeJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4, db);
    }
  }
}

function removeFromDBTypebotV4withNumberAndURL(whatsappNumber, url) {
  const db = readJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4);
  if (db[whatsappNumber]) {
    db[whatsappNumber] = db[whatsappNumber].filter(config => config.url_registro !== url);
    writeJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4, db);
  }
}

function removeFromDBTypebotV4(whatsappNumber) {
  const db = readJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4);
  delete db[whatsappNumber];
  writeJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4, db);
}

function removeFromDBTypebotV4withURL(url) {
  const db = readJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4);
  let isModified = false;

  for (const whatsappNumber in db) {
      if (db.hasOwnProperty(whatsappNumber) && db[whatsappNumber].url_registro === url) {
          delete db[whatsappNumber];
          isModified = true;
      }
  }

  // Atualiza o arquivo apenas se alguma alteração foi feita
  if (isModified) {
      writeJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4, db);
  }
}

function readFromDBTypebotV4(whatsappNumber) {
    const db = readJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4);
    const config = db[whatsappNumber];
    if (config && config.dataAgendamento) {
        config.dataAgendamento = new Date(config.dataAgendamento);
    }
    return config;
}

function listAllFromDBTypebotV4() {
    const db = readJSONFileTypebotV4(DATABASE_FILE_TYPEBOT_V4);
    Object.keys(db).forEach(key => {
        if (db[key].dataAgendamento) {
            db[key].dataAgendamento = new Date(db[key].dataAgendamento);
        }
    });
    return db;
}

function readJSONFileTypebotV4(filename) {
    try {
        return JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (error) {
        return {};
    }
}

function writeJSONFileTypebotV4(filename, data) {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

// Final das rotinas de disparo de Remarketing Agendados

// Inicio das rotinas de disparo para Grupos

const DATABASE_FILE_TYPEBOT_V5 = 'typebotDBV5.json';

async function initializeDBTypebotV5() {
  if (!fs.existsSync(DATABASE_FILE_TYPEBOT_V5)) {
      const db = {};
      writeJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5, db);
  } else {
      console.log('Banco de dados V5 já existe e não será sobrescrito.');

      // Reagenda os disparos para os grupos registrados
      const db = readJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5);
      for (const groupID in db) {
          if (db.hasOwnProperty(groupID)) {
              processGroupMessages(groupID, isFirstRun = true);
          }
      }
  }
}

function addToDBTypebotV5(groupID, message) {
  const db = readJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5);
  if (!db[groupID]) {
    db[groupID] = { 
      messages: [message],
      nextIndex: 0,
      nextDispatchTime: new Date().toISOString()
    };
  } else {
    db[groupID].messages.push(message);
  }
  writeJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5, db);
}

function updateNextDispatchV5(groupID, nextIndex, nextDispatchTime) {
  const db = readJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5);
  if (db[groupID]) {
    db[groupID].nextIndex = nextIndex;
    db[groupID].nextDispatchTime = nextDispatchTime.toISOString();
    writeJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5, db);
  }
}

function removeFromDBTypebotV5(groupID) {
  const db = readJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5);
  delete db[groupID];
  writeJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5, db);
}

function addMessageToGroupInV5(groupID, messageObj) {
  const db = readJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5);

  // Inicializa a entrada do grupo, se necessário
  db[groupID] = db[groupID] || { messages: [], nextIndex: 0, nextDispatchTime: new Date().toISOString() };

  // Verifica se é um comando !wait
  if (messageObj.type === 'text' && typeof messageObj.content === 'string' && messageObj.content.startsWith('!wait')) {
      const waitTime = messageObj.content.split(' ')[1];
      db[groupID].messages.push({ type: 'wait', content: waitTime });
  } else {
      // Adiciona outros tipos de mensagens (texto normal, imagem, vídeo, áudio, etc.)
      db[groupID].messages.push(messageObj);
  }

  writeJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5, db);
}

function readJSONFileTypebotV5(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (error) {
    return {};
  }
}

function writeJSONFileTypebotV5(filename, data) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

function listAllFromDBTypebotV5() {
  const db = readJSONFileTypebotV5(DATABASE_FILE_TYPEBOT_V5);
  return Object.keys(db);
}

// Rotinas de Disparos Agendados de Respostas Rápidas (Futuro novo remarketing)

const DATABASE_FILE_TYPEBOT_V6 = 'typebotDBV6.json';

function initializeDBTypebotV6() {
  // Verifica se o arquivo do banco de dados já existe
  if (!fs.existsSync(DATABASE_FILE_TYPEBOT_V6)) {
      // Se não existir, inicializa com um objeto vazio
      const db = {};
      writeJSONFileTypebotV6(DATABASE_FILE_TYPEBOT_V6, db);
  } else {
      // Se já existir, mantém os dados existentes
      console.log('Banco de dados V6 já existe e não será sobrescrito.');
  }
}

function addToDBTypebotV6(recipient, quickResponseConfig) {
  const db = readJSONFileTypebotV6(DATABASE_FILE_TYPEBOT_V6);
  if (!db[recipient]) {
    db[recipient] = [];
  }
  db[recipient].push({
    ...quickResponseConfig,
    scheduledDateTime: quickResponseConfig.scheduledDateTime.toISOString()
  });
  writeJSONFileTypebotV6(DATABASE_FILE_TYPEBOT_V6, db);
}

function removeFromDBTypebotV6(recipient, scheduledDateTime) {
  const db = readJSONFileTypebotV6(DATABASE_FILE_TYPEBOT_V6);
  if (db[recipient]) {
    db[recipient] = db[recipient].filter(config => new Date(config.scheduledDateTime).getTime() !== new Date(scheduledDateTime).getTime());
    writeJSONFileTypebotV6(DATABASE_FILE_TYPEBOT_V6, db);
  }
}

function removeAllFromDBTypebotV6(recipient) {
  const db = readJSONFileTypebotV6(DATABASE_FILE_TYPEBOT_V6);
  if (db[recipient]) {
    // Remove todos os registros associados ao recipient
    delete db[recipient];
    // Grava as alterações no arquivo do banco de dados
    writeJSONFileTypebotV6(DATABASE_FILE_TYPEBOT_V6, db);
  }
}

function readJSONFileTypebotV6(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (error) {
    console.error('Error reading the database file:', error);
    return {};
  }
}

function writeJSONFileTypebotV6(filename, data) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    addReloggin,
    readReloggin,
    updateReloggin,
    deleteReloggin,
    existsReloggin,
    readJSONFile,
    writeJSONFile,
    initializeDBSystem,
    readMapSystem,
    addObjectSystem,
    readInstance,
    updateObjectSystem,
    deleteObjectSystem,
    existsDBSystem,
    existsTheDBSystem,
    readInstanceURL,
    addObject,
    readMap,
    deleteObject,
    existsDB,
    updatePrompt,
    readPrompt,
    updateDelay,
    readDelay,
    updateCaption,
    readCaption,
    updateNextAudio,
    readNextAudio,
    updateinstanceName,
    readinstanceName,
    updateNextImage,
    readNextImage,
    updateSessionId,
    readSessionId,
    updateId,
    readId,
    updateInteract,
    readInteract,
    updateFluxo,
    readFluxo,
    updateOptout,
    readOptout,
    updateFlow,
    readFlow,
    initializeDB,
    addToDB,
    removeFromDB,
    updateDB,
    readFromDB,
    listAllFromDB,
    findURLByNameV1,
    salvarNoJSONSelf,
    addObjectSelf,
    deleteObjectSelf,
    existsDBSelf,
    updateFlowSelf,
    readFlowSelf,
    updateIdSelf,
    readIdSelf,
    updateInteractSelf,
    readInteractSelf,
    updateURLRegistro,
    readURLRegistro,
    updateGatilho,
    readGatilho,
    updateName,
    readName,
    readMapSelf,
    initializeDBTypebotV2,
    addToDBTypebotV2,
    removeFromDBTypebotV2,
    updateDBTypebotV2,
    readFromDBTypebotV2,
    findFlowNameByTriggerV2,
    listAllFromDBTypebotV2,
    readJSONFileTypebotV2,
    writeJSONFileTypebotV2,
    initializeDBTypebotV3,
    addToDBTypebotV3,
    removeFromDBTypebotV3,
    updateDBTypebotV3,
    readFromDBTypebotV3,
    listAllFromDBTypebotV3,
    readJSONFileTypebotV3,
    writeJSONFileTypebotV3,
    initializeDBTypebotV4,
    addToDBTypebotV4,
    updateDBTypebotV4,
    removeFromDBTypebotV4withNumberAndURL,
    removeFromDBTypebotV4,
    removeFromDBTypebotV4withURL,
    readFromDBTypebotV4,
    listAllFromDBTypebotV4,
    readJSONFileTypebotV4,
    writeJSONFileTypebotV4,
    initializeDBTypebotV5,
    addToDBTypebotV5,
    updateNextDispatchV5,
    removeFromDBTypebotV5,
    addMessageToGroupInV5,
    readJSONFileTypebotV5,
    writeJSONFileTypebotV5,
    listAllFromDBTypebotV5,
    initializeDBTypebotV6,
    addToDBTypebotV6,
    removeFromDBTypebotV6,
    removeAllFromDBTypebotV6,
    readJSONFileTypebotV6,
    writeJSONFileTypebotV6
};
  
  
