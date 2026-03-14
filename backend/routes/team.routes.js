// routes/team.routes.js - Team management routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * GET /api/team
 * Get user's teams
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { scans: true } },
      },
    });

    res.json({ success: true, data: teams });
  } catch (error) {
    logger.error('Get teams error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch teams.' });
  }
});

/**
 * POST /api/team
 * Create a new team
 */
router.post(
  '/',
  authenticate,
  [body('name').trim().notEmpty().withMessage('Team name is required').isLength({ max: 100 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Check plan allows teams
      const teamLimit = req.user.plan?.teamLimit ?? 1;
      if (teamLimit <= 1) {
        return res.status(403).json({
          success: false,
          error: 'Team creation requires Pro or Enterprise plan.',
          upgradeRequired: true,
        });
      }

      const team = await prisma.team.create({
        data: {
          name: req.body.name,
          ownerId: req.user.id,
        },
      });

      res.status(201).json({ success: true, data: team });
    } catch (error) {
      logger.error('Create team error:', error);
      res.status(500).json({ success: false, error: 'Failed to create team.' });
    }
  }
);

/**
 * POST /api/team/:id/invite
 * Invite a user to the team
 */
router.post(
  '/:id/invite',
  authenticate,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('role').isIn(['ADMIN', 'ANALYST', 'DEVELOPER', 'VIEWER']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const team = await prisma.team.findUnique({
        where: { id: req.params.id },
        include: { members: true },
      });

      if (!team || team.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Only team owner can invite members.' });
      }

      const { email, role } = req.body;
      const invitedUser = await prisma.user.findUnique({ where: { email } });

      if (!invitedUser) {
        return res.status(404).json({ success: false, error: 'User not found. They must register first.' });
      }

      // Check if already a member
      const existing = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: team.id, userId: invitedUser.id } },
      });

      if (existing) {
        return res.status(409).json({ success: false, error: 'User is already a team member.' });
      }

      const member = await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: invitedUser.id,
          role,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      logger.info(`User ${email} invited to team ${team.id}`);
      res.status(201).json({ success: true, data: member });
    } catch (error) {
      logger.error('Invite team member error:', error);
      res.status(500).json({ success: false, error: 'Failed to invite member.' });
    }
  }
);

/**
 * DELETE /api/team/:teamId/members/:userId
 * Remove a team member
 */
router.delete('/:teamId/members/:userId', authenticate, async (req, res) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });

    if (!team || team.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only team owner can remove members.' });
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId: req.params.teamId,
          userId: req.params.userId,
        },
      },
    });

    res.json({ success: true, message: 'Member removed.' });
  } catch (error) {
    logger.error('Remove team member error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove member.' });
  }
});

module.exports = router;
