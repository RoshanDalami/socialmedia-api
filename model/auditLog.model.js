import mongoose, { Schema } from 'mongoose';

const auditLogSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
        connectorId: { type: String, default: '' },
        level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
        message: { type: String, required: true },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

auditLogSchema.index({ projectId: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
