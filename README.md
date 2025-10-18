# SwiftShare

A fast, wireless way to share files between your phone and computer, with live progress updates.

## ✨ Features

- **📱 Mobile-Friendly Interface**: Optimized for iPhone and Android devices
- **⚡ Real-Time Progress**: Individual progress bars and upload speed tracking
- **🔄 Smart Retry**: Automatic retry functionality for failed uploads
- **📊 Batch Statistics**: Comprehensive upload statistics and timing
- **🎯 Duplicate Detection**: Intelligent file deduplication and conflict resolution
- **🌙 Dark Mode**: Automatic dark theme support
- **🔒 Secure**: Local network only, no external dependencies

## 🚀 Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/mishka/SwiftShare.git
   cd SwiftShare
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your mobile browser and navigate to the displayed IP address

## 📖 Usage

### Basic Usage

1. **Start SwiftShare**: Run `npm start`
2. **Connect Devices**: Ensure your mobile device and computer are on the same WiFi network
3. **Access Interface**: Open your mobile browser and go to the displayed IP address
4. **Select Files**: Choose files to upload using the file picker
5. **Upload**: Click "Upload Files" and monitor real-time progress

### Command Line Options

```bash
# Default settings (Desktop/SwiftShare, port 3000)
node server.js

# Custom save location
node server.js --save-path /path/to/save/files

# Custom port
node server.js --port 8080

# Both custom save location and port
node server.js --save-path ~/Downloads/SwiftShare --port 8080

# Examples
node server.js --save-path ~/Downloads/SwiftShare
node server.js --port 8080
node server.js --save-path "C:\Users\Username\Documents\SwiftShare" --port 5000
```

### File Management

- **Duplicate Detection**: Files with the same name and size are automatically skipped
- **Incomplete File Handling**: 0KB files (cancelled uploads) are automatically replaced
- **File Limits**: Maximum 100 files per upload session
- **File Size**: No size limits (supports large video files up to 20GB+)

## 🛠️ Development

### Project Structure

```
swiftshare/
├── server.js              # Main server application
├── public/
│   └── index.html         # Frontend interface
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🔧 Configuration

### Configuration Options

- **Port**: Use `--port` argument (default: 3000)
- **Upload Directory**: Use `--save-path` argument (default: Desktop/SwiftShare)

### Network Requirements

- Both devices must be on the same WiFi network
- No internet connection required
- Firewall may need to allow the port (default: 3000)

## 📊 Features in Detail

### Real-Time Progress Tracking

- **Individual Progress**: Each file shows its own progress bar
- **Upload Speed**: Real-time MB/s calculation
- **Elapsed Time**: Smart time formatting (seconds, minutes, hours)
- **Overall Progress**: Batch progress tracking

### Smart File Management

- **Duplicate Detection**: Compares filename and file size
- **Conflict Resolution**: Handles incomplete uploads gracefully
- **Batch Processing**: Efficient handling of multiple files
- **Error Recovery**: Automatic retry with exponential backoff

### User Interface

- **Responsive Design**: Works on all screen sizes
- **Dark Mode**: Automatic theme detection
- **Touch Optimized**: Mobile-first design
- **Real-Time Updates**: Live progress and status updates

## 🐛 Troubleshooting

### Common Issues

**Can't access from mobile device:**
- Ensure both devices are on the same WiFi network
- Check firewall settings
- Try using the computer's IP address directly

**Upload fails:**
- Check available disk space
- Ensure file permissions are correct
- Try reducing the number of files per batch

**Slow uploads:**
- Check WiFi signal strength
- Close other network-intensive applications
- Try uploading fewer files at once

### Server Logs

FileSync provides detailed logging for troubleshooting:

```
17:54:12.10 | 192.168.0.20 |    New File     | IMG_6104.mov - Ready for upload (496.1 MB)
17:54:12.11 | 192.168.0.20 |   Pre-check     | New Files - 1 file(s) ready for upload
17:54:12.12 | 192.168.0.20 |    Completed    | IMG_6104.mov - Uploaded as IMG_6104_1760727514947.mov (496.1 MB)
17:54:12.13 | 192.168.0.20 |    Completed    | Batch Upload - 1 files | 496.1 MB | 2m 15s | 3.7 MB/s
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- File uploads handled by [Multer](https://github.com/expressjs/multer)
- CORS support provided by [cors](https://github.com/expressjs/cors)

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [Issues](https://github.com/yourusername/swiftshare/issues)
3. Create a new issue with detailed information

---
