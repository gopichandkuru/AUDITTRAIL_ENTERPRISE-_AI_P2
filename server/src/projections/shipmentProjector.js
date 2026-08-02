const Shipment = require('../models/Shipment');
const { applyEvent } = require('../engine/eventReducers');

/**
 * Shipment Projector
 * Listens for new events and updates the Shipment ReadModel accordingly.
 * This is called synchronously after each command for consistency.
 * For eventual consistency, move the emit to a queue/worker.
 */

/**
 * Projects a single event onto the Shipment ReadModel.
 * Uses MongoDB upsert so it works on first event (SHIPMENT_CREATED) and subsequent ones.
 */
const projectShipmentEvent = async (event) => {
  try {
    if (event.aggregateType !== 'Shipment') return;

    // Get current read model state
    const existing = await Shipment.findOne({ shipmentId: event.aggregateId }).lean();

    // Reconstruct current state
    const currentState = existing || { shipmentId: event.aggregateId, eventCount: 0, currentVersion: 0 };
    const newState = applyEvent(currentState, event);

    // Remove Mongo internal fields before upsert
    const { _id, __v, ...updateData } = newState;

    await Shipment.findOneAndUpdate(
      { shipmentId: event.aggregateId },
      {
        $set: {
          ...updateData,
          shipmentId: event.aggregateId,
        },
      },
      { upsert: true, new: true, runValidators: false }
    );
  } catch (err) {
    console.error(`[Projector] Failed to project event ${event.eventType} for ${event.aggregateId}:`, err.message);
    // Don't re-throw — projection errors should not break command processing
    // In production, add to a dead-letter queue for reprocessing
  }
};

/**
 * Rebuild the entire ReadModel for one aggregate from scratch.
 * Used for repair / initial seeding.
 */
const rebuildShipmentReadModel = async (aggregateId) => {
  const { replayShipment } = require('../engine/eventReplay');
  const state = await replayShipment(aggregateId);
  if (!state) return null;

  const { _id, __v, ...updateData } = state;
  return Shipment.findOneAndUpdate(
    { shipmentId: aggregateId },
    { $set: { ...updateData, shipmentId: aggregateId } },
    { upsert: true, new: true, runValidators: false }
  );
};

/**
 * Rebuild all read models from the event store.
 * Called on server startup if ReadModels are stale.
 */
const rebuildAllReadModels = async () => {
  const EventStore = require('../models/EventStore');
  const aggregateIds = await EventStore.distinct('aggregateId', { aggregateType: 'Shipment' });
  console.log(`[Projector] Rebuilding ${aggregateIds.length} shipment read models...`);
  for (const id of aggregateIds) {
    await rebuildShipmentReadModel(id);
  }
  console.log('[Projector] Rebuild complete.');
};

module.exports = { projectShipmentEvent, rebuildShipmentReadModel, rebuildAllReadModels };
