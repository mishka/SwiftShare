#!/usr/bin/env node
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();

// Parse command line arguments
const args = process.argv.slice(2);
let uploadsDir;
let PORT = 3000; // Default port

// Check for --save-path argument
const savePathIndex = args.indexOf('--save-path');
if (savePathIndex !== -1 && args[savePathIndex + 1]) {
    uploadsDir = path.resolve(args[savePathIndex + 1]);
} else {
    // Default to Desktop/SwiftShare
    uploadsDir = path.join(require('os').homedir(), 'Desktop', 'SwiftShare');
}

// Check for --port argument
const portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
    const portArg = parseInt(args[portIndex + 1]);
    if (!isNaN(portArg) && portArg > 0 && portArg <= 65535) {
        PORT = portArg;
    } else {
        console.error('❌ Invalid port number. Please use a number between 1 and 65535.');
        process.exit(1);
    }
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory: ${uploadsDir}`);
}

// Enable CORS for mobile access
app.use(cors());
app.use(express.static('public'));
app.use(express.json()); 

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = file.originalname;
        const ext = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, ext);
        const newName = `${nameWithoutExt}_${timestamp}${ext}`;
        cb(null, newName);
    }
});

// Function to check if a file already exists (including partial uploads)
function checkFileExists(originalName, fileSize) {
    const files = fs.readdirSync(uploadsDir);
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    
    // Look for files that start with the same name (ignoring case)
    const existingFiles = files.filter(file => {
        const fileExt = path.extname(file);
        const fileNameWithoutExt = path.basename(file, fileExt);
        
        // Check if it's the same base name (case insensitive)
        return fileNameWithoutExt.toLowerCase().startsWith(nameWithoutExt.toLowerCase()) ||
               fileNameWithoutExt.toLowerCase().includes(nameWithoutExt.toLowerCase());
    });
    
    if (existingFiles.length > 0) {
        // Check if any existing file matches both name AND size
        for (const existingFile of existingFiles) {
            const filePath = path.join(uploadsDir, existingFile);
            const stats = fs.statSync(filePath);
            if (stats.size > 0) {
                // Check if size matches (within 1MB tolerance for different file systems)
                const sizeDifference = Math.abs(stats.size - fileSize);
                const sizeTolerance = 1024 * 1024; // 1MB tolerance
                
                if (sizeDifference <= sizeTolerance) {
                    return { exists: true, fileName: existingFile, size: stats.size };
                } else {
                    console.log(`File ${originalName} exists but different size: ${formatFileSize(stats.size)} vs ${formatFileSize(fileSize)}`);
                }
            }
        }
        
        // If all existing files are 0KB (cancelled/failed uploads), remove them and allow upload
        for (const existingFile of existingFiles) {
            const filePath = path.join(uploadsDir, existingFile);
            try {
                fs.unlinkSync(filePath);
                console.log(`Removed incomplete file: ${existingFile}`);
            } catch (unlinkError) {
                console.error(`Error removing incomplete file ${existingFile}:`, unlinkError);
            }
        }
        
        return { exists: false, canOverwrite: true, existingFiles };
    }
    
    return { exists: false };
}

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: Infinity,
        files: 100
    },
    fileFilter: (req, file, cb) => {
        // Accept all files (duplicates are handled in pre-check)
        cb(null, true);
    }
});
  
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', (req, res) => {
    const uploadHandler = upload.array('files', 100);
    
    uploadHandler(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Please check your file size.' });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ error: 'Too many files. Maximum is 100 files per upload.' });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({ error: 'Unexpected field. Please try uploading again.' });
            }
            return res.status(400).json({ error: 'Upload failed: ' + err.message });
        }

        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const uploadedFiles = req.files.map(file => ({
                originalName: file.originalname,
                savedName: file.filename,
                size: file.size,
                path: file.path
            }));

            uploadedFiles.forEach(file => {
                const isRetry = req.headers['x-retry-attempt'] === 'true';
                const retryText = isRetry ? ' (Retry)' : '';
                logFileAction('Completed', file.originalName, `Uploaded as ${file.savedName} (${formatFileSize(file.size)})${retryText}`, req);
            });

            res.json({ 
                success: true, 
                message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
                files: uploadedFiles
            });

        } catch (error) {
            console.error('Upload processing error:', error);
            res.status(500).json({ error: 'Upload processing failed' });
        }
    });
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatElapsedTime(seconds) {
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function logFileAction(type, filename, message, req = null) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        fractionalSecondDigits: 2
    });
    
    // Get client IP address
    let clientIP = 'Unknown';
    if (req) {
        clientIP = req.ip || 
                  req.connection?.remoteAddress || 
                  req.socket?.remoteAddress ||
                  (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
                  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                  'Unknown';
        
        // Clean up IPv6-mapped IPv4 addresses
        if (clientIP.startsWith('::ffff:')) {
            clientIP = clientIP.substring(7);
        }
    }
    
    let color = colors.white;
    switch (type) {
        case 'Completed':
            color = colors.green;
            break;
        case 'Already Exists':
            color = colors.yellow;
            break;
        case 'Interrupted/Corrupted':
            color = colors.red;
            break;
        case 'New File':
            color = colors.cyan;
            break;
        default:
            color = colors.white;
    }
    
    // Center the type text within 21 characters
    const typePadded = type.padStart(Math.floor((10 + type.length) / 2)).padEnd(10);
    
    console.log(`| ${colors.dim}${timestamp}${colors.reset} | ${colors.blue}${clientIP}${colors.reset} | ${color}${typePadded}${colors.reset} | ${filename} - ${message}`);
}

app.get('/info', (req, res) => {
    res.json({
        uploadsDirectory: uploadsDir,
        maxFileSize: 'Unlimited',
        supportedFormats: 'All file types'
    });
});

// Pre-check endpoint: Check files for duplicates before upload
app.post('/precheck', (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'No request body provided' });
        }
        
        const { files } = req.body;
        
        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ error: 'No files provided for pre-check' });
        }
        
        const results = [];
        const filesToUpload = [];
        const filesToSkip = [];
        
        for (const file of files) {
            const duplicateCheck = checkFileExists(file.name, file.size);
            
            if (duplicateCheck.exists) {
                // File exists and has content with matching size
                filesToSkip.push({
                    name: file.name,
                    reason: 'File already exists',
                    existingFile: duplicateCheck.fileName,
                    existingSize: formatFileSize(duplicateCheck.size)
                });
                logFileAction('Already Exists', file.name, `Found existing file: ${duplicateCheck.fileName} (${formatFileSize(duplicateCheck.size)})`, req);
            } else {
                // File doesn't exist, is 0KB (incomplete), or has different size
                if (duplicateCheck.canOverwrite) {
                    logFileAction('Interrupted/Corrupted', file.name, 'Replacing incomplete file', req);
                } else {
                    logFileAction('New File', file.name, `Ready for upload (${formatFileSize(file.size)})`, req);
                }
                filesToUpload.push(file);
            }
        }
        
        // Log pre-check summary
        if (filesToUpload.length > 0) {
            logFileAction('Pre-check', 'New Files', `${filesToUpload.length} file(s) ready for upload`, req);
        }
        if (filesToSkip.length > 0) {
            logFileAction('Pre-check', 'Skipped Files', `${filesToSkip.length} file(s) already exist`, req);
        }
        
        res.json({
            success: true,
            filesToUpload: filesToUpload,
            filesToSkip: filesToSkip,
            message: `Pre-check complete: ${filesToUpload.length} files to upload, ${filesToSkip.length} files to skip`
        });
        
    } catch (error) {
        console.error('Pre-check error:', error);
        res.status(500).json({ error: 'Pre-check failed' });
    }
});

app.post('/batch-complete', (req, res) => {
    try {
        if (!req.body) {
            return res.json({ success: true });
        }
        
        const { files, totalSizeMB, totalSizeGB, duration, averageSpeed } = req.body;
        
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 2
        });
        
        const totalSize = totalSizeGB >= 1 ? `${totalSizeGB.toFixed(2)} GB` : `${totalSizeMB.toFixed(2)} MB`;
        const formattedDuration = formatElapsedTime(duration);
        const message = `${files} files | ${totalSize} | ${formattedDuration} | ${averageSpeed.toFixed(1)} MB/s`;
        
        logFileAction('Completed', 'Batch Upload', message, req);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error processing batch complete:', error);
        res.json({ success: true }); // Still return success to not break the client
    }
});

function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    
    console.log(`\n${colors.cyan}${colors.bright}SwiftShare Server Started!${colors.reset}`);
    console.log(`${colors.dim}=====================================${colors.reset}`);
    console.log(`${colors.green}📱 Mobile Access:${colors.reset} http://${localIP}:${PORT}`);
    console.log(`${colors.blue}💻 PC Access:${colors.reset} http://localhost:${PORT}`);
    console.log(`${colors.yellow}📁 Save Location:${colors.reset} ${uploadsDir}`);
    console.log(`${colors.dim}=====================================${colors.reset}`);
    console.log(`${colors.cyan}💡 Usage:${colors.reset}`);
    console.log(`   ${colors.white}Default:${colors.reset} ./swiftshare`);
    console.log(`   ${colors.white}Custom path:${colors.reset} ./swiftshare --save-path /path/to/save`);
    console.log(`${colors.dim}=====================================${colors.reset}`);
    console.log(`${colors.green}📋 Instructions:${colors.reset}`);
    console.log('1. Make sure your iPhone/Android and PC are on the same WiFi network');
    console.log('2. Open Safari on your iPhone');
    console.log(`3. Go to: ${colors.cyan}http://${localIP}:${PORT}${colors.reset}`);
    console.log('4. Upload your files with real-time progress tracking!');
    console.log(`\n${colors.red}Press Ctrl+C to stop the server${colors.reset}\n`);
});

process.on('SIGINT', () => {
    console.log(`\n${colors.cyan}👋 Server stopped. Thanks for using SwiftShare!${colors.reset}`);
    process.exit(0);
});

