const express = require('express');
const router = express.Router();
const {
  createShipment, addItem, removeItem, changeStatus, recordTemperature,
  updateLocation, transferShipment, loadContainer, deleteShipment, updateNotes,
} = require('../../controllers/commandController');
const { authMiddleware, requireRole } = require('../../middleware/auth');
const { commandLimiter } = require('../../middleware/rateLimiter');

// All command routes require authentication
router.use(authMiddleware);
router.use(commandLimiter);

// Shipment lifecycle commands
router.post('/', requireRole(['admin', 'manager']), createShipment);
router.post('/:id/items', requireRole(['admin', 'manager']), addItem);
router.delete('/:id/items/:sku', requireRole(['admin', 'manager']), removeItem);
router.put('/:id/status', requireRole(['admin', 'manager']), changeStatus);
router.post('/:id/temperature', recordTemperature);        // all roles can log temperature
router.post('/:id/location', requireRole(['admin', 'manager']), updateLocation);
router.post('/:id/transfer', requireRole(['admin', 'manager']), transferShipment);
router.post('/:id/load-container', requireRole(['admin', 'manager']), loadContainer);
router.put('/:id/notes', updateNotes);                     // all roles can add notes
router.delete('/:id', requireRole(['admin']), deleteShipment); // admin only

module.exports = router;
