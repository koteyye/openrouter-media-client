import fs from 'fs';
import https from 'https';
import path from 'path';

export function uploadToTmpfiles(filePath: string, imgbbApiKey?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileName = path.basename(filePath);
    let fileBuffer: Buffer;
    
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch (err) {
      return reject(new Error(`Failed to read file ${filePath}: ${(err as Error).message}`));
    }
    
    const isImgbb = !!imgbbApiKey;
    const hostname = isImgbb ? 'api.imgbb.com' : 'pixi.mg';
    const requestPath = isImgbb ? `/1/upload?key=${imgbbApiKey}` : '/api';
    const fileFormName = isImgbb ? 'image' : 'file';

    const header = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fileFormName}"; filename="${fileName}"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`;
      
    const footer = `\r\n--${boundary}--\r\n`;
    
    const multipartBody = Buffer.concat([
      Buffer.from(header, 'utf-8'),
      fileBuffer,
      Buffer.from(footer, 'utf-8')
    ]);
    
    const options = {
      hostname,
      port: 443,
      path: requestPath,
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': multipartBody.length,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    console.log(`[uploader] Connecting to ${hostname}${isImgbb ? ' (ImgBB)' : ' (Piximg)'}, Content-Length: ${multipartBody.length}...`);
    
    const req = https.request(options, (res) => {
      console.log(`[uploader] Response status code: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`[uploader] Data received. Parsing response...`);
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            if (isImgbb) {
              if (json.success && json.data?.url) {
                console.log(`[uploader] ImgBB success! URL: ${json.data.url}`);
                resolve(json.data.url);
              } else {
                reject(new Error(`ImgBB error response: ${data}`));
              }
            } else {
              if (json.success && json.direct_url) {
                console.log(`[uploader] Piximg success! URL: ${json.direct_url}`);
                resolve(json.direct_url);
              } else {
                reject(new Error(`Piximg response error: ${json.error ?? data}`));
              }
            }
          } catch (err) {
            reject(new Error(`Failed to parse response: ${(err as Error).message}. Raw: ${data}`));
          }
        } else {
          reject(new Error(`Upload failed with status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (err) => {
      console.error("[uploader] Request error event:", err);
      reject(err);
    });
    
    req.write(multipartBody);
    req.end();
  });
}
