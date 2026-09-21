
const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./tests');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/downloaded:\s*(\d+)/g, 'additional: { transfer: { size_downloaded: \, size_uploaded: 0, speed_download: 0, speed_upload: 0 } }');
    
    // For harness-safety.spec.ts mock tasks
    newContent = newContent.replace(/\{\s*id:\s*('[^']+')\s*,\s*title:\s*('[^']+')\s*,\s*status:\s*('[^']+')\s*\}/g, '{ id: \, title: \, status: \, type: \\'http\\', username: \\'admin\\', size: 1000 }');

    // For mock-server.ts TaskDetail missing properties
    newContent = newContent.replace(/additional:\s*\{\s*detail:\s*\{\s*uri:\s*(.*?),\s*destination:\s*(.*?)\s*\}\s*\}/g, 'additional: { detail: { uri: \, destination: \, create_time: 0, started_time: 0, completed_time: 0, priority: \\'auto\\' } }');
    
    // For fetchSpy in http-client.test.ts
    newContent = newContent.replace(/const fetchSpy = vi.spyOn\(globalThis, 'fetch'\)/g, 'vi.spyOn(globalThis, \\'fetch\\')');

    // Remove crypto from mock-server.ts if unused
    if (file.endsWith('mock-server.ts')) {
        newContent = newContent.replace(/import \* as crypto from 'node:crypto';\n/, '');
    }

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Patched ' + file);
    }
});

