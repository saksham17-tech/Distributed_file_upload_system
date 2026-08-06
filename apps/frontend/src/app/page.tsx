"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import {
  Cloud,
  Folder,
  UploadCloud,
  Star,
  Trash2,
  Settings,
  Search,
  MoreVertical,
  File as FileIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  HardDrive,
  LogOut,
  User as UserIcon,
  Shield,
  Layers
} from "lucide-react";
import { AuthModal } from "../components/AuthModal";

export default function Dashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [token, setToken] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [currentFileSize, setCurrentFileSize] = useState(0);
  const [files, setFiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('My Files');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [storage, setStorage] = useState<{ usedBytes: number; limitBytes: number }>({ usedBytes: 0, limitBytes: 0 });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchStorage = async (jwt: string) => {
    try {
      const res = await axios.get("http://localhost:3001/user/storage", {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      setStorage(res.data);
    } catch (err) {
      console.error("Failed to fetch storage stats", err);
    }
  };

  const fetchFiles = async (jwt: string) => {
    try {
      const res = await axios.get("http://localhost:3001/files", {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      setFiles(res.data);
      await fetchStorage(jwt);
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  };

  // Setup Auth & Socket connection
  useEffect(() => {
    async function setup() {
      try {
        // Wait for user to log in manually via AuthModal
        // Do not fetch files or init socket until token is available
      } catch (err) {
        console.error("Failed to setup auth/sockets:", err);
      }
    }
    setup();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const handleAuthSuccess = (newToken: string, email: string) => {
    setToken(newToken);
    setUserEmail(email);
    fetchFiles(newToken);

    if (socket) socket.disconnect();
    const newSocket = io("http://localhost:3001", {
      auth: { token: newToken },
    });

    newSocket.on("file.available", (data) => {
      setUploadProgress(100);
      fetchFiles(newToken);
      setTimeout(() => setIsUploading(false), 3000);
    });

    setSocket(newSocket);
  };

  const handleUpload = async (file: File) => {
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setCurrentFileName(file.name);
    setCurrentFileSize(file.size);

    const headers = { Authorization: `Bearer ${token}` };
    const chunkSize = 5 * 1024 * 1024;
    const chunksCount = Math.ceil(file.size / chunkSize);
    const fileHash = file.name + "-" + file.size;

    try {
      const initRes = await axios.post("http://localhost:3001/upload/init", {
        fileHash,
        fileSize: file.size,
        filename: file.name
      }, { headers });

      if (initRes.data.exists) {
        setUploadProgress(100);
        fetchFiles(token);
        setTimeout(() => setIsUploading(false), 2000);
        return;
      }

      const { uploadId, fileId } = initRes.data;

      const urlsRes = await axios.post("http://localhost:3001/upload/presigned-urls", {
        uploadId,
        chunksCount,
        fileId
      }, { headers });

      const presignedUrls = urlsRes.data.presignedUrls;
      const etags: string[] = [];

      for (let i = 0; i < chunksCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const uploadRes = await axios.put(presignedUrls[i], chunk, {
          headers: { "Content-Type": "application/octet-stream" }
        });
        
        etags.push(uploadRes.headers.etag || `dummy-etag-${i}`);
        setUploadProgress(Math.floor(((i + 1) / chunksCount) * 90));
      }

      await axios.post("http://localhost:3001/upload/complete", {
        uploadId,
        etags,
        fileId
      }, { headers });

    } catch (err) {
      console.error("Upload failed", err);
      setIsUploading(false);
      alert("Upload failed. See console.");
    }
  };

  const handleToggleStar = async (fileId: string) => {
    try {
      await axios.patch(`http://localhost:3001/files/${fileId}/star`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFiles(token);
    } catch (err) {
      console.error("Failed to star file", err);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await axios.delete(`http://localhost:3001/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFiles(token);
    } catch (err) {
      console.error("Failed to delete file", err);
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    try {
      const res = await axios.get(`http://localhost:3001/upload/download/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.download_url || res.data.downloadUrl) {
        window.open(res.data.download_url || res.data.downloadUrl, '_blank');
      }
    } catch (err) {
      console.error("Failed to get download URL", err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black text-neutral-100 font-sans relative selection:bg-blue-500/30">
      {/* Dynamic Ambient Background Glows for Glassmorphism */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Glass Sidebar */}
      <aside className="w-64 bg-neutral-950/80 backdrop-blur-2xl border-r border-neutral-800/80 flex flex-col pt-6 pb-4 z-20 shadow-2xl">
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">NexusDrive</span>
          </div>
        </div>

        <div className="px-4 mb-6">
          <button
            onClick={() => {
              if (!token) {
                setIsAuthModalOpen(true);
                return;
              }
              const input = document.createElement('input');
              input.type = 'file';
              input.onchange = (e: any) => {
                if (e.target.files && e.target.files[0]) {
                  handleUpload(e.target.files[0]);
                }
              };
              input.click();
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 transition-all duration-300 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-500/25 border border-white/20 active:scale-[0.98]"
          >
            <UploadCloud className="w-5 h-5" />
            <span>New Upload</span>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1.5">
          <NavItem icon={<Folder />} label="My Files" active={activeTab === 'My Files'} onClick={() => setActiveTab('My Files')} />
          <NavItem icon={<Star />} label="Starred" active={activeTab === 'Starred'} onClick={() => setActiveTab('Starred')} />
          <NavItem icon={<HardDrive />} label="Computers" active={activeTab === 'Computers'} onClick={() => setActiveTab('Computers')} />
          <NavItem icon={<Trash2 />} label="Trash" active={activeTab === 'Trash'} onClick={() => setActiveTab('Trash')} />
        </nav>

        {/* Storage Widget & User Card */}
        <div className="px-4 mt-auto space-y-3">
          <div className="bg-neutral-900/60 backdrop-blur-xl rounded-2xl p-4 border border-neutral-800 shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Storage</span>
              <span className="text-xs font-medium text-blue-400">
                {storage.limitBytes ? Math.min(100, Math.round((storage.usedBytes / storage.limitBytes) * 100)) : 0}%
              </span>
            </div>
            <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" 
                style={{ width: `${storage.limitBytes ? Math.min(100, Math.round((storage.usedBytes / storage.limitBytes) * 100)) : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-2">
              {(storage.usedBytes / (1024 * 1024)).toFixed(1)} MB of {storage.limitBytes ? (storage.limitBytes / (1024 * 1024 * 1024)).toFixed(0) : 0} GB used
            </p>
          </div>

          {userEmail ? (
            <div 
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-neutral-900/60 hover:bg-neutral-900 backdrop-blur-xl border border-neutral-800 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-md border border-white/10">
                {userEmail[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{userEmail}</p>
                <p className="text-[10px] text-blue-400 font-light flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Supabase Auth
                </p>
              </div>
              <UserIcon className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-lg shadow-blue-500/25 border border-white/10"
            >
              <Shield className="w-4 h-4" />
              Sign In / Sign Up
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full z-10 overflow-hidden bg-black">
        {/* Glass Header */}
        <header className="h-20 border-b border-neutral-800/80 bg-black/60 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{activeTab}</h1>
            <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              {files.filter(f => activeTab === 'Starred' ? f.isStarred : activeTab === 'Trash' ? f.isDeleted : !f.isDeleted).length} Items
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-10 pr-4 py-2.5 w-80 bg-neutral-900/80 border border-neutral-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-white placeholder-neutral-500 outline-none backdrop-blur-xl transition-all"
            />
          </div>
        </header>

        {/* Drag & Drop Main Zone */}
        <div
          className="flex-1 p-8 overflow-y-auto relative"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {dragActive && (
            <div className="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-md border-2 border-blue-400 border-dashed rounded-3xl m-6 flex items-center justify-center pointer-events-none">
              <div className="bg-slate-900/80 px-10 py-8 rounded-3xl shadow-2xl border border-white/20 flex flex-col items-center backdrop-blur-2xl">
                <UploadCloud className="w-14 h-14 text-blue-400 mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold text-white">Drop files to upload</h3>
                <p className="text-slate-400 mt-2 text-sm">Direct S3 Concurrent Multi-Part Streaming</p>
              </div>
            </div>
          )}

          {/* Files Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {files
              .filter((f) => {
                if (activeTab === 'Starred') return f.isStarred && !f.isDeleted;
                if (activeTab === 'Trash') return f.isDeleted;
                return !f.isDeleted;
              })
              .filter((f) => f.originalName.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((file) => (
                <GlassFileCard 
                  key={file.id}
                  id={file.id}
                  name={file.originalName} 
                  size={file.fileSize ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB` : "0.5 MB"}
                  date={new Date(file.createdAt).toLocaleDateString()} 
                  type={file.mimeType.includes("pdf") ? "pdf" : file.mimeType.includes("video") ? "video" : "sheet"}
                  isStarred={file.isStarred}
                  onStar={() => handleToggleStar(file.id)}
                  onDelete={() => handleDeleteFile(file.id)}
                  onDownload={() => handleDownloadFile(file.id)}
                />
              ))}

            {files.filter((f) => {
              if (activeTab === 'Starred') return f.isStarred && !f.isDeleted;
              if (activeTab === 'Trash') return f.isDeleted;
              return !f.isDeleted;
            }).length === 0 && activeTab !== 'Computers' && (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-neutral-400 bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-800 backdrop-blur-xl">
                <Cloud className="w-14 h-14 mb-4 text-neutral-600" />
                <p className="text-lg font-semibold text-white">No files found in {activeTab}</p>
                <p className="text-xs text-neutral-500 mt-1">Upload a file or change your filter views.</p>
              </div>
            )}

            {activeTab === 'Computers' && (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-neutral-400 bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-800 backdrop-blur-xl">
                <HardDrive className="w-14 h-14 mb-4 text-blue-500/50" />
                <p className="text-lg font-semibold text-white">No Computers Linked</p>
                <p className="text-xs text-neutral-500 mt-1">Download the NexusDrive Desktop App to sync files from your local machine.</p>
                <button 
                  onClick={() => alert("NexusDrive Desktop App download link will be available soon!")}
                  className="mt-6 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-500/20 transition-all cursor-pointer"
                >
                  Download App
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload Progress Glass Banner */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-6 right-6 w-96 bg-neutral-950/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden z-40 text-white"
            >
              <div className="p-4 bg-neutral-900/60 border-b border-neutral-800 flex justify-between items-center">
                <span className="font-medium text-sm text-white flex items-center gap-2">
                  {uploadProgress === 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                  )}
                  {uploadProgress === 100 ? "Upload Completed" : "Uploading file..."}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30">
                    <FileIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {currentFileName || "uploading..."}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[11px] text-neutral-400">
                        {uploadProgress === 100 
                          ? `${(currentFileSize / (1024*1024)).toFixed(1)} MB` 
                          : `${((uploadProgress / 100) * (currentFileSize / (1024*1024))).toFixed(1)} MB / ${(currentFileSize / (1024*1024)).toFixed(1)} MB`}
                      </p>
                      <p className="text-xs font-bold text-blue-400">{uploadProgress}%</p>
                    </div>
                  </div>
                </div>
                <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      uploadProgress === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-blue-600"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
        active 
          ? "bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 text-white font-semibold shadow-lg shadow-blue-500/10" 
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <div className={`w-5 h-5 ${active ? "text-blue-400" : "text-slate-400"}`}>{icon}</div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function GlassFileCard({ 
  id,
  name, 
  size, 
  date, 
  type,
  isStarred,
  onStar,
  onDelete,
  onDownload
}: { 
  id: string;
  name: string; 
  size: string; 
  date: string; 
  type: string;
  isStarred?: boolean;
  onStar: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const getIcon = () => {
    switch (type) {
      case "pdf": return <div className="text-rose-400 bg-rose-500/15 border border-rose-500/20 p-2.5 rounded-xl"><FileIcon className="w-6 h-6" /></div>;
      case "sheet": return <div className="text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 p-2.5 rounded-xl"><FileIcon className="w-6 h-6" /></div>;
      case "video": return <div className="text-cyan-400 bg-cyan-500/15 border border-cyan-500/20 p-2.5 rounded-xl"><FileIcon className="w-6 h-6" /></div>;
      default: return <div className="text-blue-400 bg-blue-500/15 border border-blue-500/20 p-2.5 rounded-xl"><FileIcon className="w-6 h-6" /></div>;
    }
  };

  return (
    <div className="bg-neutral-900/50 hover:bg-neutral-900/80 backdrop-blur-xl p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-xl transition-all duration-300 cursor-pointer group relative">
      <div className="flex justify-between items-start mb-4">
        {getIcon()}
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onStar(); }}
            className={`p-1.5 rounded-lg transition-colors ${isStarred ? "text-amber-400 bg-amber-400/10" : "text-neutral-500 hover:text-amber-400 hover:bg-neutral-800"}`}
          >
            <Star className={`w-4 h-4 ${isStarred ? "fill-amber-400" : ""}`} />
          </button>
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-neutral-950/95 backdrop-blur-2xl rounded-xl shadow-2xl border border-neutral-800 py-1.5 z-40 text-xs text-white">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDownload(); }} 
                  className="w-full text-left px-3.5 py-2 hover:bg-blue-500/20 text-blue-300 font-medium transition-colors"
                >
                  Download
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(); }} 
                  className="w-full text-left px-3.5 py-2 hover:bg-red-500/20 text-red-400 font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <h4 className="text-sm font-semibold text-white truncate mb-1" title={name}>{name}</h4>
      <div className="flex justify-between items-center text-xs text-neutral-400 mt-2 font-light">
        <span>{size}</span>
        <span>{date}</span>
      </div>
    </div>
  );
}
