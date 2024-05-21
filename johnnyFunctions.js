const axios = require('axios');
const fs = require('fs');
const fss = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const https = require('https');
const OpenAI = require('openai');
const { spawn } = require('child_process');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
require('dotenv').config();

const db = require('./databaseFunctions');

const IP_VPS = process.env.IP_VPS;
const API_BASE_URL = `${IP_VPS}:8080`;

async function EnviarTexto(numeroId, mensagem, delay, apikey, instanceName) {
  const textPostData = {
    number: numeroId,
    options: {
      ...(delay !== null && { delay: delay }),
      presence: 'composing'
    },
    textMessage: {
      text: mensagem
    }
  };

  return brokerMaster(
    axios.post,
    `${API_BASE_URL}/message/sendText/${instanceName}`,
    textPostData,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      }
    }
  );
}

async function EnviarImagem(numeroId, linkImagem, legenda, delay, apikey, instanceName) {
  const imagePostData = {
    number: numeroId,
    options: {
      ...(delay !== null && { delay: delay }),
      presence: 'available'
    },
    mediaMessage: {
      mediatype: 'image',
      ...(legenda !== null && { caption: legenda }),
      media: linkImagem
    }
  };

  return brokerMaster(
    axios.post,
    `${API_BASE_URL}/message/sendMedia/${instanceName}`,
    imagePostData,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      }
    }
  );
}

async function EnviarVideo(numeroId, linkVideo, legenda, delay, apikey, instanceName) {
  const videoPostData = {
    number: numeroId,
    options: {
      ...(delay !== null && { delay: delay }),
      presence: 'available'
    },
    mediaMessage: {
      mediatype: 'video',
      ...(legenda !== null && { caption: legenda }),
      media: linkVideo
    }
  };

  return brokerMaster(
    axios.post,
    `${API_BASE_URL}/message/sendMedia/${instanceName}`,
    videoPostData,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      }
    }
  );
}

async function EnviarAudio(numeroId, linkAudio, delay, apikey, instanceName) {
  const audioPostData = {
    number: numeroId,
    options: {
      ...(delay !== null && { delay: delay }),
      presence: 'recording'
    },
    audioMessage: {
      audio: linkAudio
    }
  };

  return brokerMaster(
    axios.post,
    `${API_BASE_URL}/message/sendWhatsAppAudio/${instanceName}`,
    audioPostData,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      }
    }
  );
}

async function EnviarDocumento(numeroId, linkDocumento, nomeArquivo, delay, apikey, instanceName) {
  const documentPostData = {
    number: numeroId,
    options: {
      ...(delay !== null && { delay: delay }),
      presence: 'available'
    },
    mediaMessage: {
      mediatype: 'document',
      media: linkDocumento,
      fileName: nomeArquivo
    }
  };

  return brokerMaster(
    axios.post,
    `${API_BASE_URL}/message/sendMedia/${instanceName}`,
    documentPostData,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      }
    }
  );
}

async function EnviarReacao(numeroId, messageId, emoji, apikey, instanceName) {
  const reactionPostData = {
    reactionMessage: {
      key: {
        remoteJid: numeroId,
        fromMe: false,
        id: messageId
      },
      reaction: emoji
    }
  };

  return brokerMaster(
    axios.post,
    `${API_BASE_URL}/message/sendReaction/${instanceName}`,
    reactionPostData,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      }
    }
  );
}

async function EnviarLocalizacao(numeroId, nome, endereco, latitude, longitude, delay, apikey, instanceName) {
  const locationPostData = {
    number: numeroId,
    options: {
      ...(delay !== null && { delay: delay }),
      presence: 'composing'
    },
    locationMessage: {
      name: nome,
      address: endereco,
      latitude: latitude,
      longitude: longitude
    }
  };

  return brokerMaster(
    axios.post,
    `${API_BASE_URL}/message/sendLocation/${instanceName}`,
    locationPostData,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey
      }
    }
  );
}

async function downloadAndSaveMedia(messageId, mimetype, filePath, apikey, instanceName, convertToMp4 = false) {
  try {
    const data = JSON.stringify({
      message: {
        key: {
          id: messageId
        }
      },
      convertToMp4: convertToMp4
    });

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${API_BASE_URL}/chat/getBase64FromMediaMessage/${instanceName}`,
      headers: { 
        'Content-Type': 'application/json',
        'apikey': apikey
      },
      data: data
    };

    const response = await axios.request(config);

    // Verificar a resposta da API
    console.log('Resposta da API:', response.data.mediaType);

    // Extrair dados da resposta
    const base64Content = response.data.base64;
    if (!base64Content) {
      throw new Error('base64 não encontrado na resposta da API');
    }
    //const extension = mime.extension(mimetype);
    //const filePath = path.join('media', `${fileName}.${extension}`);
    // Decodificar o conteúdo Base64 e salvar no arquivo
    
    const mediaBuffer = Buffer.from(base64Content, 'base64');
    fs.writeFileSync(filePath, mediaBuffer);
    console.log(`Mídia salva em: ${filePath}`);
  } catch (error) {
    console.error('Erro ao baixar e salvar mídia:', error.message);
  }
}

async function isFromMe(event) {
  return new Promise((resolve, reject) => {
    if (event && event.data && event.data.key && typeof event.data.key.fromMe !== 'undefined') {
      resolve(event.data.key.fromMe);
    } else {
      resolve(false); // Retorna false por padrão se a estrutura esperada não for encontrada
    }
  });
}

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function initializeClientOpenai(openaiKey) {
  if (!openaiKey) {
      throw new Error('Chave OpenAI é necessária');
  }
  return new OpenAI({ apiKey: openaiKey });
}

async function deleteFile(mediaPath) {
  try {
      await fss.unlink(mediaPath);
      console.log(`Arquivo ${mediaPath} apagado com sucesso.`);
  } catch (err) {
      console.error(`Erro ao apagar o arquivo ${mediaPath}:`, err);
  }
}

// Rodando imagem IA

async function runDallE(promptText, imagePath, imageName, userOpenAiKey) {
  try {
      const openai = initializeClientOpenai(userOpenAiKey);
      const genimage = await openai.images.generate({
          model: "dall-e-3",
          prompt: promptText,
          n: 1,
          size: "1024x1024",
      });
      const imageUrl = genimage.data[0].url;
      const filePath = path.join(imagePath, `${imageName}.png`);
      await saveImage(imageUrl, filePath);
      return filePath;
  } catch (error) {
      console.error('Erro ao gerar ou salvar a imagem:', error);
      throw error;
  }
}

async function saveImage(imageUrl, filePath) {
  // Fazer uma requisição HTTP GET para a imagem
  https.get(imageUrl, (response) => {
    // Inicializar um stream de escrita no arquivo
    const fileStream = fs.createWriteStream(filePath);

    // Escrever o conteúdo da imagem no arquivo
    response.pipe(fileStream);

    // Registrar o evento de finalização da escrita
    fileStream.on('finish', () => {
      console.log(`A imagem foi salva em ${filePath}`);
    });
  });
}

//Mecanismo para reconhecimento de audio e imagem

async function runAudio(arquivo, userOpenAiKey) {
  try {
      const openai = initializeClientOpenai(userOpenAiKey);
      const transcript = await openai.audio.transcriptions.create({
          model: 'whisper-1',
          file: fs.createReadStream(arquivo),
      });
      return transcript.text;
  } catch (error) {
      console.error('Erro ao transcrever o áudio:', error);
      throw error;
  }
}

async function sintetizarFalaOpenAI(texto, nomeArquivo, voice, instanceName) {
  try {
    const requestData = {
      model: 'tts-1',
      input: texto,
      voice: voice,
    };

    // Configura os cabeçalhos da solicitação
    const headers = {
      Authorization: `Bearer ${await db.readInstance(instanceName).openaikey}`,
      'Content-Type': 'application/json',
    };

    // Realiza a solicitação
    const response = await axios.post('https://api.openai.com/v1/audio/speech', requestData, { headers, responseType: 'stream' });

    const fileStream = response.data;
    const writeStream = fs.createWriteStream(`audiosintetizado/${nomeArquivo}.ogg`);

    fileStream.pipe(writeStream);

    await new Promise((resolve) => {
      writeStream.on('finish', () => {
        console.log(`Arquivo "${nomeArquivo}.ogg" baixado com sucesso.`);
        resolve();
      });
    });
  } catch (error) {
    console.error('Erro ao fazer a solicitação:', error);
  }
}

// Função ajustada para fazer a requisição via fetch

async function textToSpeech(voiceId, text, voiceSettings, elevenlabsKey) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const headers = {
    'Content-Type': 'application/json',
    'xi-api-key': elevenlabsKey
  };
  const data = {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: voiceSettings
  };

  return fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  });
}

// Função para salvar o arquivo de áudio
function saveAudioFile(response, outputPath) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(outputPath);
    response.body.pipe(fileStream);
    response.body.on('error', (error) => {
      console.error('Erro ao salvar o arquivo de áudio:', error);
      reject(error);
    });
    fileStream.on('finish', () => {
      console.log(`Arquivo de áudio salvo: ${outputPath}`);
      resolve();
    });
  });
}

// Função para tratar erro
function handleError(err) {
  console.error('Erro na API:', err);
}

// Configs ElevenLabs
const voice_SETTINGS = {  
  similarity_boost: 0.75, 
  stability: 0.5,       
  style: 0,           
  use_speaker_boost: true
};

// Ajuste da função sintetizarFalaEleven
async function sintetizarFalaEleven(texto, nomeArquivo, voiceId, instanceName) {
  try {
    // Extrai a chave da API ElevenLabs    
    const elevenlabsKey = db.readInstance(instanceName).elevenlabskey;

    // Define o caminho do arquivo de saída no diretório audiosintetizado
    const outputPath = path.join('audiosintetizado', `${nomeArquivo}.ogg`);

    // Cria o diretório se não existir
    if (!fs.existsSync('audiosintetizado')) {
      fs.mkdirSync('audiosintetizado', { recursive: true });
    }

    // Realiza a solicitação para conversão de texto em fala
    const response = await textToSpeech(voiceId, texto, voice_SETTINGS, elevenlabsKey);
    
    if (!response.ok) {
      throw new Error(`Falha na API com status: ${response.status}`);
    }

    // Salva o arquivo de áudio
    await saveAudioFile(response, outputPath);
  } catch (error) {
    handleError(error);
    throw error; // Opcionalmente, re-lance o erro para tratamento adicional
  }
}

// ElevenLabs

async function converterArquivoOGGparaMP3(caminhoArquivoEntrada, nomeArquivoSaida) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-y', '-i', caminhoArquivoEntrada, '-loglevel', '0', '-nostats', nomeArquivoSaida]);
  
    ffmpeg.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
  
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(`Erro ao executar o comando, código de saída: ${code}`);
      } else {
        resolve(`Arquivo convertido com sucesso para o formato MP3: ${nomeArquivoSaida}`);
      }
    });
  });
  }
  
async function runImage(promptText, base64Image, userOpenAiKey) {
    try {
        const openai = initializeClientOpenai(userOpenAiKey);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: promptText },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Erro ao gerar a imagem:', error);
        throw error;
    }
}
  
async function getImageContent(filePath) {
    try {
        const imageData = fs.readFileSync(filePath);
        return imageData;
    } catch (error) {
        console.error('Erro ao ler a imagem:', error);
        throw error;
    }
}
  
function encodeImage(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    return Buffer.from(imageBuffer).toString('base64');
}
  
async function processMessageIA(messageData, numeroId, mensagem, apiKeyEVO, instanceName) {

  if (!messageData.message.conversation) {
    
    if(db.readNextAudio(numeroId) === false && messageData.message.audioMessage){
      return "N/A";
    }
    if (db.readNextAudio(numeroId) === true && !messageData.message.audioMessage && !messageData.message.imageMessage){
      return "Mídia não detectada.";
    }
    if (db.readNextAudio(numeroId) === true && messageData.message.audioMessage){
      const audioFilePath = `./audiobruto/${numeroId.split('@s.whatsapp.net')[0]}.ogg`;
      
      // Verifica se o arquivo já existe e, se sim, o remove
      if (fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }

      await downloadAndSaveMedia(messageData.key.id, messageData.message.audioMessage.mimetype, audioFilePath, apiKeyEVO, instanceName);
  
      while (true) {
        try {
          if (fs.existsSync(audioFilePath)) {
            await converterArquivoOGGparaMP3(audioFilePath, `./audioliquido/${numeroId.split('@s.whatsapp.net')[0]}.mp3`);
            fs.unlinkSync(audioFilePath);
            return await brokerMaster(runAudio, `./audioliquido/${numeroId.split('@s.whatsapp.net')[0]}.mp3`, db.readInstance(instanceName).openaikey);
          }
  
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error(err);
          break;
        }
      }
    }
    if (db.readNextImage(numeroId) === true && messageData.message.imageMessage) {
      const imageFilePath = `./imagemliquida/${numeroId.split('@s.whatsapp.net')[0]}.png`;
  
      // Verifica se o arquivo já existe e, se sim, o remove
      if (fs.existsSync(imageFilePath)) {
        fs.unlinkSync(imageFilePath);
      }
  
      // Salva a imagem recebida em um arquivo
      await downloadAndSaveMedia(messageData.key.id, messageData.message.imageMessage.mimetype, imageFilePath, apiKeyEVO, instanceName);
  
      // Loop para garantir que a imagem foi salva antes de prosseguir
      while (true) {
        try {
          if (fs.existsSync(imageFilePath)) {
            // Codifica a imagem em base64
            const base64Image = fs.readFileSync(imageFilePath, { encoding: 'base64' });
            await deleteFile(imageFilePath);          
            // Obtém a resposta do Vision e retorna
            return `Imagem enviada pelo usuário: ${await runImage(await db.readPrompt(numeroId), base64Image, db.readInstance(instanceName).openaikey)}`;
          }
  
          // Aguarda um pouco antes de verificar novamente
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error(err);
          break;
        }
      }
    }  
    if (db.readNextImage(numeroId) === false && messageData.message.imageMessage){
      return "N/A";
    }
    } 
    if (messageData.message.conversation) {
    return mensagem;
    }
}
  
function brokerMaster(requestFunction, ...args) {
    const backoffDelay = 2000;
    const maxRetries = 10;
  
    return new Promise((resolve, reject) => {
      const makeRequest = (retryCount) => {
        requestFunction(...args)
          .then((response) => {
            resolve(response);
          })
          .catch((error) => {
            if (retryCount === maxRetries) {
              reject(error);
              return;
            }
  
            const delay = backoffDelay * Math.pow(2, retryCount);
            console.log(`Tentativa ${retryCount + 1} falhou. Tentando novamente em ${delay}ms...`);
            console.log(error);
            setTimeout(() => makeRequest(retryCount + 1), delay);
          });
      };
  
      makeRequest(0);
    });
}
  
  //Mecanismo para produção de audio

module.exports = {
  EnviarTexto,
  EnviarImagem,
  EnviarVideo,
  EnviarAudio,
  EnviarDocumento,
  EnviarReacao,
  EnviarLocalizacao,
  deleteFile,
  downloadAndSaveMedia,
  isFromMe,
  delay,
  runDallE,
  saveImage,
  runAudio,
  sintetizarFalaOpenAI,
  textToSpeech,
  saveAudioFile,
  handleError,
  sintetizarFalaEleven,
  converterArquivoOGGparaMP3,
  runImage,
  getImageContent,
  encodeImage,
  processMessageIA,
  brokerMaster,
  initializeClientOpenai
};
