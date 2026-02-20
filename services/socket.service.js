let ioInstance = null;

export const initSocket = (io) => {
    ioInstance = io;
};

export const getSocket = () => ioInstance;

export const emitToUser = (userId, event, data) => {
    if (!ioInstance) return;
    ioInstance.to(`user:${userId}`).emit(event, data);
};

export const emitToProject = (projectId, event, data) => {
    if (!ioInstance) return;
    ioInstance.to(`project:${projectId}`).emit(event, data);
};
