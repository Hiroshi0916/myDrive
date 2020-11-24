import { Request, Response } from "express";
import FileService from "../services/FileService";
import MongoService from "../services/ChunkService/MongoService";
import FileSystemService from "../services/ChunkService/FileSystemService";
import S3Service from "../services/ChunkService/S3Service";
import {UserInterface} from "../models/user";
import tempStorage from "../tempStorage/tempStorage";
import sendShareEmail from "../utils/sendShareEmail";
import { createStreamVideoCookie } from "../cookies/createCookies";

const fileService = new FileService()

type userAccessType = {
    _id: string,
    emailVerified: boolean,
    email: string,
    s3Enabled: boolean,
}

interface RequestTypeRefresh extends Request {
    user?: UserInterface,
    encryptedToken?: string
}

interface RequestTypeFullUser extends Request {
    user?: UserInterface,
    encryptedToken?: string
}

interface RequestType extends Request {
    user?: userAccessType,
    encryptedToken?: string
}

type ChunkServiceType = MongoService | FileSystemService | S3Service;

class FileController {

    chunkService: ChunkServiceType;

    constructor(chunkService: ChunkServiceType) {

        this.chunkService = chunkService;
    }

    getThumbnail = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {

            return;
        }
    
        try {
            
    
            const user = req.user;
            const id = req.params.id;
    
            const decryptedThumbnail = await this.chunkService.getThumbnail(user, id);
        

            res.send(decryptedThumbnail);
    
        } catch (e) {

            console.log("\nGet Thumbnail Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }

    }

    getFullThumbnail = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return;
        }

        try {

            const user = req.user;
            const fileID = req.params.id;

            await this.chunkService.getFullThumbnail(user, fileID, res);

        } catch (e) {
            console.log("\nGet Thumbnail Full Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    uploadFile = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
        
            return 
        }
    
        try {

            const user = req.user;
            const busboy = req.busboy;
            
            req.pipe(busboy);
    
            const file = await this.chunkService.uploadFile(user, busboy, req);
         
            res.send(file);
            
        } catch (e) {
            console.log("sending error upload")
            const code = e.code || 500;
            console.log(e.message, e.exception)
            res.writeHead(code, {'Connection': 'close'})
            res.end();
            //return res.status(code).send();
        }
    }

    getPublicDownload = async(req: RequestType, res: Response) => {

        try {

            const ID = req.params.id;
            const tempToken = req.params.tempToken;
    
            await this.chunkService.getPublicDownload(ID, tempToken, res);
    
        } catch (e) {
    
            const code = e.code || 500;
            const message = e.message || e;

            console.log(message, e);
            res.status(code).send();
        } 
    }

    removeLink = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const id = req.params.id;
            const userID = req.user._id;

            console.log("remove link", id);
    
            await fileService.removeLink(userID, id)
    
            res.send();
    
        } catch (e) {

            const code = e.code || 500;

            console.log(e);
            res.status(code).send();
        }

    }

    makePublic = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {

            const fileID = req.params.id;
            const userID = req.user._id;
    
            const token = await fileService.makePublic(userID, fileID);

            res.send(token);
    
        } catch (e) {
            
            const code = e.code || 500;

            console.log(e);
            res.status(code).send();
        }
    }

    getPublicInfo = async(req: RequestType, res: Response) => {

        try {

            const id = req.params.id;
            const tempToken = req.params.tempToken;
            
            const file = await fileService.getPublicInfo(id, tempToken);

            res.send(file);
    
        } catch (e) {
            
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }
    }

    makeOneTimePublic = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const id = req.params.id;
            const userID = req.user._id;
            
            const token = await fileService.makeOneTimePublic(userID, id);

            res.send(token);

        } catch (e) {
            
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }

    }

    getFileInfo = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const fileID = req.params.id;
            const userID = req.user._id;
    
            const file = await fileService.getFileInfo(userID, fileID);
    
            res.send(file);
    
        } catch (e) {
            
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }
    }

    getQuickList = async(req: RequestType, res: Response) => { 

        if (!req.user) {
            return;
        }
    
        try {
    
            const user = req.user;

            const quickList = await fileService.getQuickList(user);

            res.send(quickList);
    
        } catch (e) {
            
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }
    }

    getList = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return
        }
    
        try {

            console.log("Get file list")

            const user = req.user;
            const query = req.query;
            
            const fileList = await fileService.getList(user, query);

            res.send(fileList);

            console.log("file list send", fileList.length)
    
        } catch (e) {
            
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }
    }

    getDownloadToken = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return 
        }
    
        try {

            const user = req.user;

            const tempToken = await fileService.getDownloadToken(user);
    
            res.send({tempToken});
    
        } catch (e) {
            
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }
    }

    getAccessTokenStreamVideo = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) return;

        try {

            const user = req.user;

            const ipAddress = req.clientIp;

            const streamVideoAccessToken = await user.generateAuthTokenStreamVideo(ipAddress);

            createStreamVideoCookie(res, streamVideoAccessToken);

            res.send();

        } catch (e) {

            console.log("\nGet Access Token Stream Video Fle Route Error:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }

    }

    // getDownloadTokenVideo = async(req: RequestTypeFullUser, res: Response) => {

    //     if (!req.user) {
    //         return 
    //     }
    
    //     try {
    
    //         const user = req.user;
    //         const cookie = req.headers.uuid as string;
    
    //         const tempToken = await fileService.getDownloadTokenVideo(user, cookie);
    
    //         res.send({tempToken});
    
    //     } catch (e) {

    //         const code = e.code || 500;

    //         console.log(e);
    //         res.status(code).send()
    //     }
    // }

    removeTempToken = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return 
        }
    
        try {

            const user = req.user
            const tempToken = req.params.tempToken;
            const currentUUID = req.params.uuid;

            await fileService.removeTempToken(user, tempToken, currentUUID);

            res.send();
            
        } catch (e) {

            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }
    }

    streamVideo = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const user = req.user;
            const fileID = req.params.id;
            const headers = req.headers;

            await this.chunkService.streamVideo(user, fileID, headers, res, req);

        } catch (e) {

            const code = e.code || 500;
            const message = e.message || e;

            console.log(message, e);
            res.status(code).send();
        }

    }

    downloadFile = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const user = req.user;
            const fileID = req.params.id;

            console.log("DOWNLOAD FILE USER ID", user._id);

            await this.chunkService.downloadFile(user, fileID, res);
    
        } catch (e) {
            
            const code = e.code || 500;
            const message = e.message || e;

            console.log(message, e);
            res.status(code).send();
        } 
    }

    getSuggestedList = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const userID = req.user._id;
            let searchQuery = req.query.search || "";
    
            const {fileList, folderList} = await fileService.getSuggestedList(userID, searchQuery);
    
            return res.send({folderList, fileList})
    
    
        } catch (e) {
    
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }
    }

    renameFile = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const fileID = req.body.id;
            const title = req.body.title
            const userID = req.user._id;
    
            await fileService.renameFile(userID, fileID, title)

            res.send();
            
        } catch (e) {
    
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }
    
    }

    sendEmailShare = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }

        try {
            
            const user = req.user!;
        
            const fileID = req.body.file._id;
            const respient = req.body.file.resp;
        
            const file = await fileService.getFileInfo(user._id, fileID);
        
            await sendShareEmail(file, respient)
        
            res.send()

        } catch (e) {
            console.log("Send Email Share Error", e);
            const code = e.code || 500;
            res.status(code).send();
        }
    }

    moveFile = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const fileID = req.body.id;
            const userID = req.user._id;
            const parentID = req.body.parent;
    
            console.log(fileID, userID, parentID);

            await fileService.moveFile(userID, fileID, parentID);

            res.send();
            
        } catch (e) {
    
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }

    }

    deleteFile = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const userID = req.user._id;
            const fileID = req.body.id;
    
            await this.chunkService.deleteFile(userID, fileID);
    
            res.send()
    
        } catch (e) {
            
            const code = e.code || 500;

            console.log(e);
            res.status(code).send()
        }
    }
}

export default FileController;
