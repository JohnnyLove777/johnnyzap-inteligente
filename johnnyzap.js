const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const pm2 = require('pm2');
const axios = require('axios');
const Jimp = require('jimp');
const WebSocket = require('ws');
const http = require('http');
require('dotenv').config();

const johnny = require('./johnnyFunctions');
const db = require('./databaseFunctions');

const DATABASE_FILE_TYPE = 'typebotDB.json';
const DATABASE_FILE_TYPEBOT_V2 = 'typebotDBV2.json';
const DATABASE_FILE_TYPEBOT_V3 = 'typebotDBV3.json';

const db_length = 1200;

const IP_VPS = process.env.IP_VPS;

console.log("Bem-vindo ao JohnnyZap Inteligênte 1.5 - A Integração mais completa Typebot + Whatsapp + OpenAI e ElevenLabs");

// Conectando ao daemon do PM2
pm2.connect((err) => {
    if (err) {
        console.error('Erro ao conectar-se ao PM2:', err);
        process.exit(1);
    }
  
    // Adicionamos os eventos de captura
    pm2.launchBus((err, bus) => {
        if (err) {
            console.error('Erro ao lançar o bus do PM2:', err);
            process.exit(1);
        }
  
        // Listener para o evento de erro
        bus.on('log:err', (data) => {
            if (data.process.name === 'johnnyzap') {                 
                    setTimeout(() => {
                        pm2.restart('johnnyzap', (err) => {
                            if (err) {
                                console.error('Erro ao tentar reiniciar o johnnyzap:', err);
                                return;
                            }
                            console.log('johnnyzap reiniciado com sucesso.');
                        });
                    }, 10000); // 10 segundos                
            }
        });
    });
});

// Rotinas que implementam o disparo de mensagens em massa pelo Dashboard

let timeoutHandles = [];
let isCampaignRunning = false;

// Função para limpar todos os timeouts e parar a campanha
function stopCampaign() {
  timeoutHandles.forEach(clearTimeout);
  timeoutHandles = [];
  isCampaignRunning = false;
}

// Função para iniciar o disparo de mensagens
function startCampaign(data) {
  const { listaleads, minDelay, maxDelay, startPosition, endPosition, fluxoSelecionado } = data;
  let listaContatos;

  try {
    // Supondo que você tenha uma função para ler o arquivo JSON
    listaContatos = readJSONFile(`./leadslista/${listaleads}`);
  } catch (error) {
    console.error('Erro ao ler o arquivo de leads', error);
    // Envie uma mensagem de erro para o cliente
    return;
  }

  const subListaContatos = listaContatos.slice(startPosition, endPosition + 1);
  let currentContactIndex = 0;

  isCampaignRunning = true;

  const sendNextMessage = () => {
    if (currentContactIndex < subListaContatos.length && isCampaignRunning) {
      const contato = subListaContatos[currentContactIndex];
      // Inserir aqui rotina de disparo do gatilho de V2 para o contato
      dispararFluxoV2ParaContato(contato, fluxoSelecionado);

      const delayAleatorio = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      // Supondo que você tenha uma função para enviar uma mensagem de status
      sendStatusMessage(`Disparo ${currentContactIndex + 1}/${subListaContatos.length}: Enviei o bloco de remarketing ao número: ${contato} e com delay de ${delayAleatorio}`);

      currentContactIndex++;
      const timeoutHandle = setTimeout(sendNextMessage, delayAleatorio);
      timeoutHandles.push(timeoutHandle);
    } else {
      stopCampaign(); // Parar a campanha quando todos os contatos forem processados ou quando a campanha for cancelada
    }
  };

  // Iniciar a campanha
  sendNextMessage();
}

// Supondo que você tenha uma função para enviar mensagens de status
function sendStatusMessage(message) {
  console.log(message);
  // Envie a mensagem para a interface do usuário ou algum sistema de log
}

// Fim das rotinas que implementam o disparo de mensagens em massa via Dashboard

const appWeb = express();
const serverWeb = http.createServer(appWeb);
const wss = new WebSocket.Server({ server: serverWeb });

appWeb.use(express.static('public'));

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
      //console.log('received: %s', message);
      // Tentativa de processar a mensagem JSON
      try {
        const parsedMessage = JSON.parse(message);
        
        // Verificar se a ação é de registrar JohnnyZap
        if (parsedMessage.action === 'registerTypeZap') {
            console.log('Dados recebidos:', parsedMessage.data);
            const { url, instanciaNome, instanciaChave, openAIKey, elevenLabsKey } = parsedMessage.data;
        
            try {
                // Adiciona o novo objeto no sistema
                db.addObjectSystem(instanciaNome, url, openAIKey || '', elevenLabsKey || '', instanciaChave);                
                console.log('JohnnyZap Instância registrada com sucesso! Pow pow tei tei, pra cima deles!!');
            } catch (error) {
                ws.send(`Erro ao registrar JohnnyZap: ${error.message}`);
            }
        }        
        else if (parsedMessage.action === 'atualizarLista') {
          //console.log('Apertou botão para atualizar lista');
      
          // Define o caminho para o arquivo typebotDB.json
          const filePath = path.join(__dirname, 'typebotDB.json');
      
          // Lê o conteúdo do arquivo
          fs.readFile(filePath, 'utf8', (err, data) => {
              if (err) {
                  console.error('Erro ao ler o arquivo:', err);
                  // Informa ao cliente que houve um erro ao ler o arquivo
                  ws.send(JSON.stringify({ error: 'Erro ao acessar os dados dos fluxos.' }));
                  return;
              }
      
              // Se não houver erro, parseia os dados do JSON e envia para o cliente
              try {
                  const fluxos = JSON.parse(data);
                  ws.send(JSON.stringify({
                      action: 'listaAtualizada',
                      data: fluxos
                  }));
                  //console.log('Lista de fluxos enviada ao cliente.');
              } catch (parseError) {
                  console.error('Erro ao parsear os dados do arquivo:', parseError);
                  // Informa ao cliente que houve um erro ao processar os dados
                  ws.send(JSON.stringify({ error: 'Erro ao processar os dados dos fluxos.' }));
              }
          });
        }
        else if (parsedMessage.action === 'excluirFluxo') {
          const { nome } = parsedMessage.data;
          //console.log(`Apertou botão para excluir fluxo: ${parsedMessage.data.nome}`);
          db.removeFromDB(nome);
          // Aqui você pode adicionar a lógica para excluir um fluxo específico
          ws.send(`Fluxo ${parsedMessage.data.nome} excluído com sucesso!`);
        }
        else if (parsedMessage.action === 'confirmarAdicao') {
          //console.log('Apertou botão para confirmar adição');
          const { url, nome, gatilho } = parsedMessage.data;
          //console.log(`Registrando JohnnyZap com URL: ${url}, Nome do Fluxo: ${nome}, Gatilho do Fluxo: ${gatilho}`);        
          const typebotConfig = {
            url_registro: url,
            gatilho: gatilho,
            name: nome
            };
            db.addToDB(typebotConfig);
        }
        else if (parsedMessage.action === 'atualizarListaRapida') {
          //console.log('Apertou botão para atualizar lista rapida');
      
          // Define o caminho para o arquivo typebotDB.json
          const filePath = path.join(__dirname, 'typebotDBV2.json');
      
          // Lê o conteúdo do arquivo
          fs.readFile(filePath, 'utf8', (err, data) => {
              if (err) {
                  console.error('Erro ao ler o arquivo:', err);
                  // Informa ao cliente que houve um erro ao ler o arquivo
                  ws.send(JSON.stringify({ error: 'Erro ao acessar os dados dos fluxos.' }));
                  return;
              }
      
              // Se não houver erro, parseia os dados do JSON e envia para o cliente
              try {
                  const fluxos = JSON.parse(data);
                  ws.send(JSON.stringify({
                      action: 'listaRapidaAtualizada',
                      data: fluxos
                  }));
                  //console.log('Lista de fluxos rapidos enviada ao cliente.');
              } catch (parseError) {
                  console.error('Erro ao parsear os dados do arquivo:', parseError);
                  // Informa ao cliente que houve um erro ao processar os dados
                  ws.send(JSON.stringify({ error: 'Erro ao processar os dados dos fluxos.' }));
              }
          });
        }
        else if (parsedMessage.action === 'excluirRapida') {
          const { nome } = parsedMessage.data;
          //console.log(`Apertou botão para excluir fluxo rapido: ${parsedMessage.data.nome}`);
          db.removeFromDBTypebotV2(nome);
          // Aqui você pode adicionar a lógica para excluir um fluxo específico
          ws.send(`Fluxo Rapido ${parsedMessage.data.nome} excluído com sucesso!`);
        }
        else if (parsedMessage.action === 'confirmarAdicaoRapida') {
          //console.log('Apertou botão para confirmar adição');
          const { nome, gatilho } = parsedMessage.data;
          //console.log(`Registrando Resposta Rapida, Nome do Fluxo: ${nome}, Frase de Disparo: ${gatilho}`);        
          const typebotConfig = {
            gatilho: gatilho,
            name: nome
            };
            db.addToDBTypebotV2(nome,typebotConfig);
        }
        else if (parsedMessage.action === 'atualizarListaRmkt') {
          //console.log('Apertou botão para atualizar lista rapida');
      
          // Define o caminho para o arquivo typebotDB.json
          const filePath = path.join(__dirname, 'typebotDBV3.json');
      
          // Lê o conteúdo do arquivo
          fs.readFile(filePath, 'utf8', (err, data) => {
              if (err) {
                  console.error('Erro ao ler o arquivo:', err);
                  // Informa ao cliente que houve um erro ao ler o arquivo
                  ws.send(JSON.stringify({ error: 'Erro ao acessar os dados dos fluxos.' }));
                  return;
              }
      
              // Se não houver erro, parseia os dados do JSON e envia para o cliente
              try {
                  const fluxos = JSON.parse(data);
                  ws.send(JSON.stringify({
                      action: 'listaRmktAtualizada',
                      data: fluxos
                  }));
                  //console.log('Lista de remarketing enviada ao cliente.');
              } catch (parseError) {
                  console.error('Erro ao parsear os dados do arquivo:', parseError);
                  // Informa ao cliente que houve um erro ao processar os dados
                  ws.send(JSON.stringify({ error: 'Erro ao processar os dados dos fluxos.' }));
              }
          });
        }
        else if (parsedMessage.action === 'excluirRmkt') {
          const { url } = parsedMessage.data;
          //console.log(`Apertou botão para excluir remarketing: ${parsedMessage.data.url}`);
          db.removeFromDBTypebotV3(url);
          // Aqui você pode adicionar a lógica para excluir um fluxo específico
          ws.send(`Remarketing ${parsedMessage.data.url} excluído com sucesso!`);
        }
        else if (parsedMessage.action === 'confirmarAdicaoRmkt') {
         // console.log('Apertou botão para confirmar adição');
          const {url, nome, dias } = parsedMessage.data;
          //console.log(`Registrando Remarketing, Nome do Fluxo: ${nome}, Dias para Disparo: ${dias}`);        
          const urlRmkt = url;
          const typebotConfig = {
          disparo: `${dias}`,
          name: nome
          };
          db.addToDBTypebotV3(urlRmkt,typebotConfig);
        }
        else if (parsedMessage.action === 'atualizarGrupo') {
          //console.log('Apertou botão para atualizar grupo');
      
          // Define o caminho para o arquivo typebotDB.json
          const filePath = path.join(__dirname, 'typebotDBV5.json');
      
          // Lê o conteúdo do arquivo
          fs.readFile(filePath, 'utf8', (err, data) => {
              if (err) {
                  console.error('Erro ao ler o arquivo:', err);
                  // Informa ao cliente que houve um erro ao ler o arquivo
                  ws.send(JSON.stringify({ error: 'Erro ao acessar os dados dos fluxos.' }));
                  return;
              }
      
              // Se não houver erro, parseia os dados do JSON e envia para o cliente
              try {
                  const grupos = JSON.parse(data);
                  // Iterar sobre os grupos e extrair os IDs
                  const fluxos = Object.keys(grupos).map(id => {
                  return { name: id };
                  });
                  ws.send(JSON.stringify({
                      action: 'listaGrupoAtualizada',
                      data: fluxos
                  }));
                  //console.log('Lista de remarketing enviada ao cliente.');
              } catch (parseError) {
                  console.error('Erro ao parsear os dados do arquivo:', parseError);
                  // Informa ao cliente que houve um erro ao processar os dados
                  ws.send(JSON.stringify({ error: 'Erro ao processar os dados dos fluxos.' }));
              }
          });
        }
        else if (parsedMessage.action === 'excluirGrupo') {
          const { name } = parsedMessage.data;
          //console.log(`Apertou botão para excluir grupo: ${parsedMessage.data.name}`);
          db.removeFromDBTypebotV5(name);
          // Aqui você pode adicionar a lógica para excluir um fluxo específico
          ws.send(`Grupo ${parsedMessage.data.name} excluído com sucesso!`);
        }
        else if (parsedMessage.action === 'uploadLeads') {
          const leads = JSON.parse(parsedMessage.data);
          const fileName = parsedMessage.fileName; // Extrai o nome do arquivo da mensagem  
          const dir = 'leadslista';
          if (!fs.existsSync(dir)){
              fs.mkdirSync(dir, { recursive: true });
          }
      
          fs.writeFile(`${dir}/${fileName}`, JSON.stringify(leads, null, 2), 'utf8', (err) => {
              if (err) {
                  console.error('Erro ao salvar o arquivo de leads', err);
                  ws.send(JSON.stringify({ action: 'error', message: 'Erro ao carregar a lista de leads' }));
              } else {
                  ws.send(JSON.stringify({ action: 'success', message: 'Lista de leads carregada com sucesso' }));
              }
          });
        }
        else if (parsedMessage.action === 'uploadMedia') {
          const mediaData = parsedMessage.data;
          const fileName = parsedMessage.fileName; // Extrai o nome do arquivo da mensagem
          const dir = 'media';
          
          // Verifica se o diretório existe e, se não, cria-o de forma recursiva
          if (!fs.existsSync(dir)){
              fs.mkdirSync(dir, { recursive: true });
          }
      
          const filePath = `${dir}/${fileName}`;
          
          // Cria um fluxo de escrita de arquivo
          const fileStream = fs.createWriteStream(filePath);
      
          // Evento de erro do fluxo de escrita
          fileStream.on('error', (err) => {
              console.error('Erro ao salvar o arquivo de mídia', err);
              ws.send(JSON.stringify({ action: 'error', message: 'Erro ao carregar o arquivo de mídia' }));
          });
      
          // Evento de finalização do fluxo de escrita
          fileStream.on('finish', () => {
              ws.send(JSON.stringify({ action: 'success', message: 'Arquivo de mídia carregado com sucesso' }));
          });
      
          // Escreve os dados da mídia no arquivo utilizando o fluxo de escrita
          fileStream.write(mediaData, 'base64');
      
          // Finaliza o fluxo de escrita
          fileStream.end();
        }
  
  
        else if (parsedMessage.action === 'iniciarCampanha') {
          //console.log(JSON.stringify(parsedMessage.data));
          // Coloque aqui a rotina de inicio do disparo de mensagens
          startCampaign(parsedMessage.data);
        }
        else if (parsedMessage.action === 'pararCampanha') {
          //console.log('Servidor Parar check!!');
          // Coloque aqui um ponto de parada e limpeza do cache do disparo de mensagens
          stopCampaign();
          // Enviar confirmação de parada da campanha para o usuário
          sendStatusMessage('Campanha de disparo de mensagens foi cancelada com sucesso.');
        }
  
        else if (parsedMessage.action === 'atualizarListaLeads') {
          const directoryPath = path.join(__dirname, 'leadslista');
          
          // Lê o diretório para pegar os nomes dos arquivos
          fs.readdir(directoryPath, (err, files) => {
              if (err) {
                  console.error('Erro ao ler a pasta:', err);
                  ws.send(JSON.stringify({ error: 'Erro ao acessar a lista de leads.' }));
                  return;
              }
              
              // Filtra apenas arquivos .json
              const jsonFiles = files.filter(file => path.extname(file) === '.json');
              
              ws.send(JSON.stringify({
                  action: 'listaLeadsAtualizada',
                  data: jsonFiles
              }));
              //console.log('Lista de leads enviada ao cliente.');
          });
        }
        else if (parsedMessage.action === 'atualizarListaFluxos') {
          //console.log('Apertou botão para atualizar lista de fluxos');
          
          // Define o caminho para o arquivo typebotDBV2.json
          const filePath = path.join(__dirname, 'typebotDBV2.json');
          
          // Lê o conteúdo do arquivo
          fs.readFile(filePath, 'utf8', (err, data) => {
              if (err) {
                  console.error('Erro ao ler o arquivo:', err);
                  // Informa ao cliente que houve um erro ao ler o arquivo
                  ws.send(JSON.stringify({ error: 'Erro ao acessar os dados dos fluxos.' }));
                  return;
              }
          
              // Se não houver erro, parseia os dados do JSON e envia para o cliente
              try {
                  const fluxos = JSON.parse(data);
                  const fluxosArray = Object.keys(fluxos).map(key => ({
                      name: fluxos[key].name,
                      gatilho: fluxos[key].gatilho
                  }));
                  ws.send(JSON.stringify({
                      action: 'listaFluxosAtualizada',
                      data: fluxosArray
                  }));
                  //console.log('Lista de fluxos enviada ao cliente.');
              } catch (parseError) {
                  console.error('Erro ao parsear os dados do arquivo:', parseError);
                  // Informa ao cliente que houve um erro ao processar os dados
                  ws.send(JSON.stringify({ error: 'Erro ao processar os dados dos fluxos.' }));
              }
          });
        }
  
      } catch (e) {
        console.error('Erro ao processar a mensagem:', e);
        ws.send('Erro ao processar a mensagem recebida');
      }
    });
  
    ws.send('Conexão WebSocket estabelecida com sucesso!');
});

serverWeb.listen(3031, function() {
    console.log(`Servidor do JohnnyZap com o Dashboard em ${IP_VPS}:3031`);
});

//Mecanismo para criar pasta

function createFolderIfNotExists(folderPath) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`Pasta criada: ${folderPath}`);
    } else {
        console.log(`Pasta já existe: ${folderPath}`);
    }
}
  
// Caminhos das pastas
const leadsPath = path.join(__dirname, 'leadslista');
const registroPath = path.join(__dirname, 'registrolista');
const audioBrutoPath = path.join(__dirname, 'audiobruto');
const audioLiquidoPath = path.join(__dirname, 'audioliquido');
const audioSintetizadoPath = path.join(__dirname, 'audiosintetizado');
const imagemPath = path.join(__dirname, 'imagemliquida');
  
// Criar as pastas
createFolderIfNotExists(leadsPath);
createFolderIfNotExists(registroPath);
createFolderIfNotExists(audioBrutoPath);
createFolderIfNotExists(audioLiquidoPath);
createFolderIfNotExists(audioSintetizadoPath);
createFolderIfNotExists(imagemPath);
  
//Fim do mecanismo para criar pasta

// Configs ElevenLabs
const voice_SETTINGS = {  
    similarity_boost: 0.75, 
    stability: 0.5,       
    style: 0,           
    use_speaker_boost: true
};

// Inicializando banco de dados das Instancias
db.initializeDBSystem();
// Inicializando banco de dados dos fluxos do Typebot
db.initializeDB();
// Inicializando banco de dados das respostas Rápidas
db.initializeDBTypebotV2();
// Inicializando banco de dados do remarketing
db.initializeDBTypebotV3();
// Inicializando banco de dados dos disparos agendados
db.initializeDBTypebotV4();
// Inicializando banco de dados dos disparos para grupos
db.initializeDBTypebotV5();
// Inicializando banco de dados dos disparos agendados de respsotas rapidas (Novo Remarketing)
db.initializeDBTypebotV6();

// Middleware para processar JSON
app.use(express.json());

// Servir a pasta "media" estaticamente
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use('/audiosintetizado', express.static(path.join(__dirname, 'audiosintetizado')));
app.use('/imagemliquida', express.static(path.join(__dirname, 'imagemliquida')));

// Cria a pasta "media" se não existir
if (!fs.existsSync('media')) {
  fs.mkdirSync('media');
}

async function waitWithDelay(inputString) {
    // Verifica se a string começa com '!wait'
    if (inputString.startsWith('!wait')) {
      // Extrai o número da string usando expressões regulares
      const match = inputString.match(/\d+/);
      
      if (match) {
        // Converte o número para um valor inteiro
        const delayInSeconds = parseInt(match[0]);
        
        // Aguarda o atraso usando o valor extraído
        await new Promise(resolve => setTimeout(resolve, delayInSeconds * 1000));
        
        //console.log(`Aguardou ${delayInSeconds} segundos.`);
      } else {
        const defaultDelayInSeconds = 3;
        await new Promise(resolve => setTimeout(resolve, defaultDelayInSeconds * 1000));
      }
    }
}

async function createSessionJohnny(datafrom, dataid, url_registro, fluxo, instanceName, apiKeyEVO) {   
  
    const reqData = JSON.stringify({
      isStreamEnabled: true,
      message: "string", // Substitua se necessário
      resultId: "string", // Substitua se necessário
      isOnlyRegistering: false,
      prefilledVariables: {
        number: datafrom.split('@')[0]
      },
    });
  
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: url_registro,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      data: reqData
    };
  
    try {
      const response = await axios.request(config);
  
      const messages = response.data.messages;
  
      if (!db.existsDB(datafrom)) {
        db.addObject(datafrom, response.data.sessionId, datafrom.replace(/\D/g, ''), dataid, 'typing', fluxo, false, "active", false, false, null, null, null, instanceName, db_length);
      }    
      
      for (const message of messages){
        if (!["text", "image", "audio", "video"].includes(message.type)) {
          console.log(`Tipo '${message.type}' não permitido. Pulando registro com ID: ${message.id}`);
          continue; // Pula para a próxima iteração do laço
        }
        if (message.type === 'text') {
          let formattedText = '';
          for (const richText of message.content.richText) {
            for (const element of richText.children) {
              let text = '';
              //console.log(JSON.stringify(element));
      
              if (element.text) {
                text = element.text;
              }
              if (element.url) {
                text = element.url;
              }
              else if (element.type === 'p') {
                // Extrai o valor de 'children' assumindo que o primeiro item contém o texto desejado
                text = element.children[0].text;             
              }
              else if (element.type === 'inline-variable') {              
                text = element.children[0].children[0].text;              
              }
      
              if (element.bold) {
                text = `*${text}*`;
              }
              if (element.italic) {
                text = `_${text}_`;
              }
              if (element.underline) {
                text = `~${text}~`;
              }
      
              formattedText += text;
            }
            formattedText += '\n';
          }
      
          formattedText = formattedText.replace(/\n$/, '');
          if (formattedText.startsWith('!wait')) {
            await waitWithDelay(formattedText);
          }
          if (formattedText.startsWith('!caption')) {
            const caption = formattedText.split(" ")[1];
            db.updateCaption(datafrom, caption);
          }
          if (formattedText.startsWith('!fim')) {
            if (db.existsDB(datafrom)) {
              db.updateFlow(datafrom, "inactive");
            }
          }
          if (formattedText.startsWith('!optout')) {
            if (db.existsDB(datafrom)) {
              db.updateOptout(datafrom, true);
              db.removeFromDBTypebotV4(datafrom);
            }
          }
          if (formattedText.startsWith('!reiniciar')) {
            if (db.existsDB(datafrom)) {
              db.deleteObject(datafrom);           
            }
          }          
          if (formattedText.startsWith('!directmessage')) {
            const partes = formattedText.split(' ');
  
            const destino = partes[1];
            const conteudo = partes.slice(2).join(' ');

            johnny.EnviarTexto(destino, conteudo, 2000, apiKeyEVO, instanceName);
          }
          if (formattedText.startsWith('!arquivo')) {
            const partes = formattedText.split(' ');  
            const linkDocumento = partes[1];
            const nomeArquivo = partes[2];
            johnny.EnviarDocumento(datafrom, linkDocumento, nomeArquivo, 2000, apiKeyEVO, instanceName);
          }
          if (formattedText.startsWith('!reaction')) {
            const partes = formattedText.split(' ');  
            const emoji = partes[1];
            johnny.EnviarReacao(datafrom, dataid, emoji, apiKeyEVO, instanceName);
          }
          if (formattedText.startsWith('!local')) {
            const partes = formattedText.split(' ');            
            const latitude = parseFloat(partes[1]);
            const longitude = parseFloat(partes[2]);
            
            // Extrair o nome e o endereço entre colchetes
            const regexNome = /\[(.*?)\]/;
            const nomeMatch = formattedText.match(regexNome);
            const nome = nomeMatch ? nomeMatch[1] : '';
        
            // Remover o primeiro match (nome) do texto
            const restanteTexto = formattedText.replace(nomeMatch[0], '');
        
            // Procurar pelo próximo match (endereço)
            const enderecoMatch = restanteTexto.match(regexNome);
            const endereco = enderecoMatch ? enderecoMatch[1] : '';
        
            johnny.EnviarLocalizacao(numeroId, nome, endereco, latitude, longitude, 2000, apiKeyEVO, instanceName);
          }
          if (formattedText.startsWith('!split')) {
            const regexConteudo = /\[(.*?)\]/g;
            const matches = [...formattedText.matchAll(regexConteudo)];
    
            const caracteres = matches[0] ? matches[0][1] : '';
            const texto = matches[1] ? matches[1][1] : '';
    
            // Split o texto pelos caracteres fornecidos
            const conteudos = texto.split(caracteres);
    
            // Função para enviar os textos com delay
            const enviarComDelay = (conteudos, delay) => {
            conteudos.forEach((conteudo, index) => {
            setTimeout(() => {
                johnny.EnviarTexto(datafrom, conteudo.trim(), 4000, apiKeyEVO, instanceName);
            }, index * delay);
          });
          };

           // Enviar cada conteúdo separadamente com delay de 2 segundos (2000 ms)
          enviarComDelay(conteudos, 3000);
          }
          if (formattedText.startsWith('!entenderaudio')) {          
            if (db.existsDB(datafrom)) {
              db.updateNextAudio(datafrom, true);
            }
          }
          if (formattedText.startsWith('!entenderimagem')) {          
            if (db.existsDB(datafrom)) {
              db.updateNextImage(datafrom, true);
              db.updatePrompt(datafrom, formattedText.split(' ').slice(1).join(' '));
            }
          }
          if (formattedText.startsWith('!audioopenai')) {          
            if (db.existsDB(datafrom)) {                    
                try {
                    // Sintetizar a fala
                    await johnny.brokerMaster(johnny.sintetizarFalaOpenAI, formattedText.split(' ').slice(2).join(' '), datafrom.split('@s.whatsapp.net')[0], formattedText.split(' ')[1], instanceName);
                    // Caminho do arquivo de áudio gerado
                    const mediaPath = `audiosintetizado/${datafrom.split('@s.whatsapp.net')[0]}.ogg`;
                    const url_target = `http://:${PORT}/${mediaPath}`;
                    johnny.EnviarAudio(datafrom, url_target, 3000, apiKeyEVO, instanceName)
                    .then(() => {
                      // Chame deleteFile após o sucesso de EnviarAudio
                      return johnny.deleteFile(mediaPath);
                  })
                  .catch(err => {
                      console.error('Erro ao enviar o áudio:', err);
                  });                    
                } catch (error) {
                    console.error('Erro ao sintetizar fala:', error);
                }
            }
          }
          if (formattedText.startsWith('!audioeleven')) {
      if (db.existsDB(datafrom)) {              
          try {
              // Sintetizar a fala usando ElevenLabs
              await johnny.brokerMaster(johnny.sintetizarFalaEleven, formattedText.split(' ').slice(2).join(' '), datafrom.split('@s.whatsapp.net')[0], formattedText.split(' ')[1], instanceName);
              // Caminho do arquivo de áudio gerado
              const mediaPath = `audiosintetizado/${datafrom.split('@s.whatsapp.net')[0]}.ogg`;
              const url_target = `${IP_VPS}:${PORT}/${mediaPath}`;              
              johnny.EnviarAudio(datafrom, url_target, 3000, apiKeyEVO, instanceName)
              .then(() => {
                // Chame deleteFile após o sucesso de EnviarAudio
                return johnny.deleteFile(mediaPath);
            })
            .catch(err => {
                console.error('Erro ao enviar o áudio:', err);
            });
          } catch (error) {
              console.error('Erro ao sintetizar fala com ElevenLabs:', error);
          }
      }
          }
          if (formattedText.startsWith('!imagemopenai')) {
            
            await johnny.runDallE(formattedText.split(' ').slice(1).join(' '), 'imagemliquida', datafrom.split('@s.whatsapp.net')[0], db.readInstance(instanceName).openaikey)
                .then(async (filePath) => {
                    // Verifica se a imagem existe antes de enviar
                    while (true) {
            try {
                if (fs.existsSync(filePath)) {
                    await Jimp.read(filePath); // Tenta ler a imagem
                    break; // Se a imagem for lida sem erros, saia do loop
                }
            } catch (error) {
                console.log("A imagem ainda está sendo renderizada...");
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1 segundo
            }                    
            const mediaPath = `imagemliquida/${datafrom.split('@s.whatsapp.net')[0]}.png`;
            const url_target = `${IP_VPS}:${PORT}/${mediaPath}`;              
            johnny.EnviarImagem(datafrom, url_target, db.readCaption(datafrom), 2000, apiKeyEVO, instanceName)
            .then(() => {
              // Chame deleteFile após o sucesso de EnviarImagem
              return johnny.deleteFile(mediaPath);
          })
          .catch(err => {
              console.error('Erro ao enviar o imagem:', err);
          });
                })
                .catch((error) => console.error("Erro durante a geração da imagem:", error));
          }                                
          if (!(formattedText.startsWith('!wait')) && !(formattedText.startsWith('!split')) && !(formattedText.startsWith('!arquivo')) && !(formattedText.startsWith('!reaction')) && !(formattedText.startsWith('!local')) && !(formattedText.startsWith('!caption')) && !(formattedText.startsWith('!fim')) && !(formattedText.startsWith('!optout')) && !(formattedText.startsWith('!reiniciar')) && !(formattedText.startsWith('!media')) && !(formattedText.startsWith('!directmessage')) && !(formattedText.startsWith('Invalid message. Please, try again.')) && !(formattedText.startsWith('!rapidaagendada')) && !(formattedText.startsWith('!entenderaudio')) && !(formattedText.startsWith('!entenderimagem')) && !(formattedText.startsWith('!audioopenai')) && !(formattedText.startsWith('!audioeleven')) && !(formattedText.startsWith('!imagemopenai'))) {
            johnny.EnviarTexto(datafrom, formattedText, 2000, apiKeyEVO, instanceName);  
            //db.updateDelay(datafrom, null);          
          }      
        }
        if (message.type === 'image') {          
            const url_target = message.content.url;
            johnny.EnviarImagem(datafrom, url_target, db.readCaption(datafrom), 2000, apiKeyEVO, instanceName);
            //db.updateDelay(datafrom, null);
            db.updateCaption(datafrom, null);        
        }                          
        if (message.type === 'video') {          
            const url_target = message.content.url;
            johnny.EnviarVideo(datafrom, url_target, db.readCaption(datafrom), 2000, apiKeyEVO, instanceName);
            //db.updateDelay(datafrom, null);
            db.updateCaption(datafrom, null);
        }                            
        if (message.type === 'audio') {          
            const url_target = message.content.url;
            johnny.EnviarAudio(datafrom, url_target, 3000, apiKeyEVO, instanceName);
            //db.updateDelay(datafrom, null);
        } 
      }

      if(db.existsDB(datafrom)){
        db.updateSessionId(datafrom, response.data.sessionId);
        db.updateId(datafrom, dataid);
        db.updateInteract(datafrom, 'done');
        db.updateFlow(datafrom, "active");
        db.updateName(datafrom, fluxo);
      }     
    } catch (error) {
      console.log(error);
    }
}

async function processMessageV2(messageBody, datafrom, dataid, instanceName, apiKeyEVO) {
  const typebotConfigsV2 = db.readJSONFileTypebotV2(DATABASE_FILE_TYPEBOT_V2); // Lê os dados do banco de dados V2

  for (const key in typebotConfigsV2) {
      if (typebotConfigsV2.hasOwnProperty(key)) {
          const typebotConfigV2 = typebotConfigsV2[key];
          
          // Verifica se a mensagem corresponde ao gatilho
          if (typebotConfigV2.gatilho === messageBody) {
              const name = typebotConfigV2.name;
              
              // Agora, busca o registro correspondente no banco de dados principal
              const mainTypebotConfigs = db.readJSONFile(DATABASE_FILE_TYPE);
              const mainTypebotConfig = mainTypebotConfigs[name];

              if (mainTypebotConfig) {
                  // Se encontrou o registro, executa a adição da sessão
                  await createSessionJohnny(datafrom, dataid, mainTypebotConfig.url_registro, mainTypebotConfig.name, instanceName, apiKeyEVO);
                  await scheduleRemarketing(mainTypebotConfig.name, datafrom, dataid, instanceName, apiKeyEVO);
                  break; // Sai do loop após encontrar o gatilho correspondente
              }
          }
      }
  }
}

async function scheduleRemarketing(name, datafrom, messageId, instanceName, apiKeyEVO) {
  const remarketingConfigs = db.readJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3);
  for (const url in remarketingConfigs) {
      if (remarketingConfigs.hasOwnProperty(url)) {
          const config = remarketingConfigs[url];
          if (config.name === name) {
              const diasParaAdicionar = parseFloat(config.disparo);
              if (!isNaN(diasParaAdicionar)) {
                  const dataFutura = new Date();

                  // Converte diasParaAdicionar para horas e minutos
                  const horasParaAdicionar = Math.floor(diasParaAdicionar * 24);
                  const minutosParaAdicionar = Math.floor((diasParaAdicionar * 24 * 60) % 60);

                  // Adiciona horas e minutos à data atual
                  dataFutura.setHours(dataFutura.getHours() + horasParaAdicionar);
                  dataFutura.setMinutes(dataFutura.getMinutes() + minutosParaAdicionar);

                  // Agende a ação de remarketing usando dataFutura
                  scheduleAction(dataFutura, url, name, datafrom, messageId, instanceName, apiKeyEVO);

                  // Adicione o agendamento ao banco de dados V4
                  const agendamentoConfig = {
                      url_registro: url,
                      dataAgendamento: dataFutura,
                      messageId: messageId,
                      instanceName: instanceName,
                      apiKeyEVO: apiKeyEVO
                  };
                  db.addToDBTypebotV4(datafrom, agendamentoConfig);

                  console.log(`Agendado para: ${dataFutura.toISOString()} - URL: ${url}`);
              }
          }
      }
  }
}

function scheduleAction(dataFutura, url, name, datafrom, messageId, instanceName, apiKeyEVO) {
  const agora = new Date();
  const delay = dataFutura.getTime() - agora.getTime(); // Calcula o tempo de espera em milissegundos

  if (delay <= 0) {
      console.log("A data de disparo já passou. Executando agora.");
      if(!db.readOptout(datafrom)){
      db.deleteObject(datafrom);
      processMessageRMKT(datafrom, messageId, url, name, instanceName, apiKeyEVO);
      db.removeFromDBTypebotV4withNumberAndURL(datafrom, url);
      }
  } else {
      console.log(`Agendando ação de remarketing para ${dataFutura} (URL: ${url})`);
      
      // Agendar a ação
      setTimeout(() => {
          if(!db.readOptout(datafrom)){
          db.deleteObject(datafrom);          
          processMessageRMKT(datafrom, messageId, url, name, instanceName, apiKeyEVO);
          db.removeFromDBTypebotV4withNumberAndURL(datafrom, url);
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
  const typebotConfigsV3 = db.readJSONFileTypebotV3(DATABASE_FILE_TYPEBOT_V3); // Lê os dados do banco de dados V3

  // Busca a configuração correspondente à URL fornecida
  const typebotConfigV3 = typebotConfigsV3[url];

  if (typebotConfigV3) {
      // Se encontrou o registro, executa a adição da sessão
      db.deleteObject(datafrom);
      await createSessionJohnny(datafrom, messageId, url, name, instanceName, apiKeyEVO);
  } else {
      console.log(`Nenhuma configuração encontrada para a URL: ${url}`);
  }
}

// Listener de Mensagem Recebida e Enviada
app.post('/webhook/messages-upsert', async (req, res) => {
    
    const event = req.body;
  
    const messageData = event.data;
    const instanceName = event.instance;  

    const instanceData = db.readMapSystem(instanceName);
    if (!instanceData) {
    console.error(`Instância ${instanceName} não encontrada. Processamento encerrado.`);
    return;
    }
    const apiKeyEVO = instanceData.apiKeyEVO;
    const messageBody = messageData.message.conversation; // Mensagem enviada
    const remoteJid = messageData.key.remoteJid; // Numero de wpp do remetente
    const messageId = messageData.key.id; // ID da mensagem original para reações e baixar mídia
  
    try {
      const fromMe = await johnny.isFromMe(event);
      //console.log(`fromMe: ${fromMe}`);
  
      if (fromMe) {
        // Resposta Rápida
        await processMessageV2(messageBody, remoteJid, messageId, instanceName, apiKeyEVO);        
      } else if (!fromMe) {
           
        const typebotKey = await db.readFluxo(remoteJid);

        if (!typebotKey) {
            if (remoteJid.endsWith('@s.whatsapp.net')) {
              const typebotConfigs = db.readJSONFile(DATABASE_FILE_TYPE); // Lê os dados do arquivo JSON
              for (const key in typebotConfigs) {
                  if (typebotConfigs.hasOwnProperty(key)) {
                      const typebotConfig = typebotConfigs[key];              
                      
                      // Verifica se a mensagem corresponde ao gatilho, ou se o gatilho é "null" e a mensagem não é nula
                      if ((typebotConfig.gatilho === messageBody) || (typebotConfig.gatilho === "null")) {
                          // Inicia a sessão com o Typebot correspondente
                          await createSessionJohnny(remoteJid, messageId, typebotConfig.url_registro, typebotConfig.name, instanceName, apiKeyEVO);
                          await scheduleRemarketing(typebotConfig.name, remoteJid, messageId, instanceName, apiKeyEVO);
                          break; // Sai do loop após encontrar o gatilho correspondente
                      }
                  }
              }
            }    
        } else {
            if (db.existsDB(remoteJid) && remoteJid.endsWith('@s.whatsapp.net') && db.readInteract(remoteJid) === 'done' && db.readId(remoteJid) !== messageId && db.readFlow(remoteJid) === "active" && db.readinstanceName(remoteJid) === instanceName){
                            
              db.updateInteract(remoteJid, 'typing');
              db.updateId(remoteJid, messageId);
                
                const sessionId = await db.readSessionId(remoteJid);
                const chaturl = `${db.readInstanceURL(instanceName).url_chat}${sessionId}/continueChat`;
                
                const content = await johnny.processMessageIA(messageData, remoteJid, messageBody, apiKeyEVO, instanceName);
                db.updateNextAudio(remoteJid, false);
                db.updateNextImage(remoteJid, false);        
                
                const reqData = {
                  message: content,
                };
              
                const config = {
                  method: 'post',
                  maxBodyLength: Infinity,
                  url: chaturl,
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                  },
                  data: JSON.stringify(reqData),
                };
              
                try {
                  const response = await axios.request(config);
                  //console.log(JSON.stringify(response.data));
                  const messages = response.data.messages;
                  //console.log(JSON.stringify(messages));                  
                  for (const message of messages){
                    if (!["text", "image", "audio", "video"].includes(message.type)) {
                      console.log(`Tipo '${message.type}' não permitido. Pulando registro com ID: ${message.id}`);
                      continue; // Pula para a próxima iteração do laço
                    }
                    if (message.type === 'text') {
                      let formattedText = '';
                      for (const richText of message.content.richText) {
                        for (const element of richText.children) {
                          let text = '';
                          //console.log(JSON.stringify(element));
                  
                          if (element.text) {
                            text = element.text;
                          }
                          if (element.url) {
                            text = element.url;
                          }
                          else if (element.type === 'p') {
                            // Extrai o valor de 'children' assumindo que o primeiro item contém o texto desejado
                            text = element.children[0].text;             
                          }
                          else if (element.type === 'inline-variable') {              
                            text = element.children[0].children[0].text;              
                          }
                  
                          if (element.bold) {
                            text = `*${text}*`;
                          }
                          if (element.italic) {
                            text = `_${text}_`;
                          }
                          if (element.underline) {
                            text = `~${text}~`;
                          }
                  
                          formattedText += text;
                        }
                        formattedText += '\n';
                      }
                  
                      formattedText = formattedText.replace(/\n$/, '');
                      if (formattedText.startsWith('!wait')) {
                        await waitWithDelay(formattedText);
                      }
                      if (formattedText.startsWith('!caption')) {
                        const caption = formattedText.split(" ")[1];
                        db.updateCaption(remoteJid, caption);
                      }
                      if (formattedText.startsWith('!fim')) {
                        if (db.existsDB(remoteJid)) {
                          db.updateFlow(remoteJid, "inactive");
                        }
                      }
                      if (formattedText.startsWith('!optout')) {
                        if (db.existsDB(remoteJid)) {
                          db.updateOptout(remoteJid, true);
                          db.removeFromDBTypebotV4(remoteJid);
                        }
                      }
                      if (formattedText.startsWith('!reiniciar')) {
                        if (db.existsDB(remoteJid)) {
                          db.deleteObject(remoteJid);
                        }
                      }
                      if (formattedText.startsWith('!directmessage')) {
                        const partes = formattedText.split(' ');
              
                        const destino = partes[1];
                        const conteudo = partes.slice(2).join(' ');
            
                        johnny.EnviarTexto(destino, conteudo, 2000, apiKeyEVO, instanceName);
                        //db.updateDelay(remoteJid, null);
                        
                      }
                      if (formattedText.startsWith('!arquivo')) {
                        const partes = formattedText.split(' ');  
                        const linkDocumento = partes[1];
                        const nomeArquivo = partes[2];
                        johnny.EnviarDocumento(remoteJid, linkDocumento, nomeArquivo, 2000, apiKeyEVO, instanceName);
                      }
                      if (formattedText.startsWith('!reaction')) {
                        const partes = formattedText.split(' ');  
                        const emoji = partes[1];
                        johnny.EnviarReacao(remoteJid, messageId, emoji, apiKeyEVO, instanceName);
                      }
                      if (formattedText.startsWith('!local')) {
                        const partes = formattedText.split(' ');            
                        const latitude = parseFloat(partes[1]);
                        const longitude = parseFloat(partes[2]);
                        
                        // Extrair o nome e o endereço entre colchetes
                        const regexNome = /\[(.*?)\]/;
                        const nomeMatch = formattedText.match(regexNome);
                        const nome = nomeMatch ? nomeMatch[1] : '';
                    
                        // Remover o primeiro match (nome) do texto
                        const restanteTexto = formattedText.replace(nomeMatch[0], '');
                    
                        // Procurar pelo próximo match (endereço)
                        const enderecoMatch = restanteTexto.match(regexNome);
                        const endereco = enderecoMatch ? enderecoMatch[1] : '';
                    
                        johnny.EnviarLocalizacao(remoteJid, nome, endereco, latitude, longitude, 2000, apiKeyEVO, instanceName);
                      }
                      if (formattedText.startsWith('!split')) {
                        const regexConteudo = /\[(.*?)\]/g;
                        const matches = [...formattedText.matchAll(regexConteudo)];
    
                        const caracteres = matches[0] ? matches[0][1] : '';
                        const texto = matches[1] ? matches[1][1] : '';
    
                        // Split o texto pelos caracteres fornecidos
                        const conteudos = texto.split(caracteres);
    
                        // Função para enviar os textos com delay
                        const enviarComDelay = (conteudos, delay) => {
                        conteudos.forEach((conteudo, index) => {
                        setTimeout(() => {
                        johnny.EnviarTexto(remoteJid, conteudo.trim(), 4000, apiKeyEVO, instanceName);
                        }, index * delay);
                        });
                        };
                        // Enviar cada conteúdo separadamente com delay de 2 segundos (2000 ms)
                        enviarComDelay(conteudos, 3000);
                      }
                      if (formattedText.startsWith('!entenderaudio')) {          
                        if (db.existsDB(remoteJid)) {
                          db.updateNextAudio(remoteJid, true);
                        }
                      }
                      if (formattedText.startsWith('!entenderimagem')) {          
                        if (db.existsDB(remoteJid)) {
                          db.updateNextImage(remoteJid, true);
                          db.updatePrompt(remoteJid, formattedText.split(' ').slice(1).join(' '));
                        }
                      }
                      if (formattedText.startsWith('!audioopenai')) {          
                        if (db.existsDB(remoteJid)) {                    
                            try {
                                // Sintetizar a fala
                                await johnny.brokerMaster(johnny.sintetizarFalaOpenAI, formattedText.split(' ').slice(2).join(' '), remoteJid.split('@s.whatsapp.net')[0], formattedText.split(' ')[1], instanceName);
                                // Caminho do arquivo de áudio gerado
                                const mediaPath = `audiosintetizado/${remoteJid.split('@s.whatsapp.net')[0]}.ogg`;
                                const url_target = `${IP_VPS}:${PORT}/${mediaPath}`;
                                johnny.EnviarAudio(remoteJid, url_target, 3000, apiKeyEVO, instanceName)
                                .then(() => {
                                  return johnny.deleteFile(mediaPath);
                              })
                              .catch(err => {
                                  console.error('Erro ao enviar o áudio:', err);
                              });                   
                            } catch (error) {
                                console.error('Erro ao sintetizar fala:', error);
                            }
                        }
                      }
                      if (formattedText.startsWith('!audioeleven')) {
                  if (db.existsDB(remoteJid)) {              
                      try {
                          // Sintetizar a fala usando ElevenLabs
                          await johnny.brokerMaster(johnny.sintetizarFalaEleven, formattedText.split(' ').slice(2).join(' '), remoteJid.split('@s.whatsapp.net')[0], formattedText.split(' ')[1], instanceName);
                          // Caminho do arquivo de áudio gerado
                          const mediaPath = `audiosintetizado/${remoteJid.split('@s.whatsapp.net')[0]}.ogg`;
                          const url_target = `${IP_VPS}:${PORT}/${mediaPath}`;              
                          johnny.EnviarAudio(remoteJid, url_target, 3000, apiKeyEVO, instanceName)
                          .then(() => {
                            // Chame deleteFile após o sucesso de EnviarAudio
                            return johnny.deleteFile(mediaPath);
                        })
                        .catch(err => {
                            console.error('Erro ao enviar o áudio:', err);
                        });
                      } catch (error) {
                          console.error('Erro ao sintetizar fala com ElevenLabs:', error);
                      }
                  }
                      }
                      if (formattedText.startsWith('!imagemopenai')) {
                        
                        await johnny.runDallE(formattedText.split(' ').slice(1).join(' '), 'imagemliquida', remoteJid.split('@s.whatsapp.net')[0], db.readInstance(instanceName).openaikey)
                            .then(async (filePath) => {
                                // Verifica se a imagem existe antes de enviar
                                while (true) {
                        try {
                            if (fs.existsSync(filePath)) {
                                await Jimp.read(filePath); // Tenta ler a imagem
                                break; // Se a imagem for lida sem erros, saia do loop
                            }
                        } catch (error) {
                            console.log("A imagem ainda está sendo renderizada...");
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1 segundo
                        }                    
                        const mediaPath = `imagemliquida/${remoteJid.split('@s.whatsapp.net')[0]}.png`;
                        const url_target = `${IP_VPS}:${PORT}/${mediaPath}`;              
                        johnny.EnviarImagem(remoteJid, url_target, db.readCaption(remoteJid), 2000, apiKeyEVO, instanceName)
                        .then(() => {
                          // Chame deleteFile após o sucesso de EnviarImagem
                          return johnny.deleteFile(mediaPath);
                      })
                      .catch(err => {
                          console.error('Erro ao enviar a imagem:', err);
                      });
                            })
                            .catch((error) => console.error("Erro durante a geração da imagem:", error));
                      }                         
                      if (!(formattedText.startsWith('!wait')) && !(formattedText.startsWith('!split')) && !(formattedText.startsWith('!arquivo')) && !(formattedText.startsWith('!reaction')) && !(formattedText.startsWith('!local')) && !(formattedText.startsWith('!caption')) && !(formattedText.startsWith('!fim')) && !(formattedText.startsWith('!optout')) && !(formattedText.startsWith('!reiniciar')) && !(formattedText.startsWith('!media')) && !(formattedText.startsWith('!directmessage')) && !(formattedText.startsWith('Invalid message. Please, try again.')) && !(formattedText.startsWith('!rapidaagendada')) && !(formattedText.startsWith('!entenderaudio')) && !(formattedText.startsWith('!entenderimagem')) && !(formattedText.startsWith('!audioopenai')) && !(formattedText.startsWith('!audioeleven')) && !(formattedText.startsWith('!imagemopenai'))) {
                        johnny.EnviarTexto(remoteJid, formattedText, 2000, apiKeyEVO, instanceName);  
                        //db.updateDelay(remoteJid, null);
                      }                                                    
                    }
                    if (message.type === 'image') {          
                        const url_target = message.content.url;
                        johnny.EnviarImagem(remoteJid, url_target, db.readCaption(remoteJid), 2000, apiKeyEVO, instanceName);
                        //db.updateDelay(remoteJid, null);
                        db.updateCaption(remoteJid, null);        
                    }                          
                    if (message.type === 'video') {          
                        const url_target = message.content.url;
                        johnny.EnviarVideo(remoteJid, url_target, db.readCaption(remoteJid), 2000, apiKeyEVO, instanceName);
                        //db.updateDelay(remoteJid, null);
                        db.updateCaption(remoteJid, null);
                    }                            
                    if (message.type === 'audio') {          
                        const url_target = message.content.url;
                        johnny.EnviarAudio(remoteJid, url_target, 3000, apiKeyEVO, instanceName);
                        //db.updateDelay(remoteJid, null);
                    }  
                                            
                  }                  
                  db.updateInteract(remoteJid, 'done');
                } catch (error) {
                  console.log(error);
                }        
            } 
           } 

      }
  
      res.sendStatus(200);
    } catch (error) {
      console.error('Erro ao processar a mensagem:', error);
      res.sendStatus(500);
    }
  });

// Porta onde o servidor vai escutar
const PORT = 3030;
app.listen(PORT, () => {
  console.log(`Servidor Webhook EVO escutando na porta ${PORT}`);
});
