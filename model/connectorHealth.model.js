import mongoose, { Schema } from 'mongoose';

const connectorHealthSchema = new Schema(
    {
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
        connectorId: { type: String, required: true, index: true },
        status: { type: String, enum: ['ok', 'no_data', 'degraded', 'down'], default: 'ok' },
        lastError: { type: String, default: '' },
        lastCheckedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

connectorHealthSchema.index({ projectId: 1, connectorId: 1 }, { unique: true });

export const ConnectorHealth = mongoose.model('ConnectorHealth', connectorHealthSchema);
