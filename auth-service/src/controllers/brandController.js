const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const Brand = require('../models/Brand');
const BrandMember = require('../models/BrandMember');
const User = require('../models/User');
const { createError } = require('../utils/error');
const { UPLOAD_DIR } = require('../middleware/brandLogoUpload');

async function getMembership(userId, brandId) {
  return BrandMember.findOne({
    brand: brandId,
    user: userId,
  });
}

async function assertMember(req, brandId) {
  if (!mongoose.Types.ObjectId.isValid(brandId)) {
    throw createError(400, 'Invalid brand id');
  }
  const brand = await Brand.findById(brandId);
  if (!brand) {
    throw createError(404, 'Brand not found');
  }
  const membership = await getMembership(req.user._id, brandId);
  if (!membership) {
    throw createError(403, 'Not a member of this brand');
  }
  return { brand, membership };
}

async function assertAdmin(req, brandId) {
  const { brand, membership } = await assertMember(req, brandId);
  if (membership.role !== 'admin') {
    throw createError(403, 'Only brand admins can perform this action');
  }
  return { brand, membership };
}

// @route   GET /api/brands
exports.listMyBrands = async (req, res, next) => {
  try {
    const memberships = await BrandMember.find({ user: req.user._id })
      .populate('brand')
      .sort({ updatedAt: -1 })
      .lean();

    const brands = memberships
      .filter((m) => m.brand)
      .map((m) => ({
        id: m.brand._id,
        name: m.brand.name,
        city: m.brand.city,
        country: m.brand.country,
        businessType: m.brand.businessType || '',
        description: m.brand.description,
        logo_url: m.brand.logo_url || '',
        role: m.role,
        createdAt: m.brand.createdAt,
        updatedAt: m.brand.updatedAt,
      }));

    res.json({ success: true, brands });
  } catch (e) {
    next(e);
  }
};

// @route   POST /api/brands
exports.createBrand = async (req, res, next) => {
  try {
    const { name, city, country, businessType, description = '' } = req.body;
    const bt = typeof businessType === 'string' ? businessType.trim() : '';
    if (!bt) {
      return next(createError(400, 'Business type is required'));
    }
    if (bt.length > 120) {
      return next(createError(400, 'Business type must be at most 120 characters'));
    }

    const brand = await Brand.create({
      name,
      city,
      country,
      businessType: bt,
      description,
      createdBy: req.user._id,
    });

    await BrandMember.create({
      brand: brand._id,
      user: req.user._id,
      role: 'admin',
    });

    res.status(201).json({
      success: true,
      brand: {
        id: brand._id,
        name: brand.name,
        city: brand.city,
        country: brand.country,
        businessType: brand.businessType,
        description: brand.description,
        logo_url: brand.logo_url || '',
        role: 'admin',
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
      },
    });
  } catch (e) {
    next(e);
  }
};

// @route   POST /api/brands/:brandId/logo
exports.uploadBrandLogo = async (req, res, next) => {
  try {
    const { brand } = await assertAdmin(req, req.params.brandId);
    if (!req.file) {
      return next(createError(400, 'Logo image is required (form field name: logo)'));
    }
    const brandId = req.params.brandId;
    const files = await fs.readdir(UPLOAD_DIR).catch(() => []);
    for (const f of files) {
      if (f === req.file.filename) continue;
      const dot = f.lastIndexOf('.');
      const stem = dot === -1 ? f : f.slice(0, dot);
      if (stem === brandId) {
        await fs.unlink(path.join(UPLOAD_DIR, f)).catch(() => {});
      }
    }
    const publicPath = `/uploads/brand-logos/${req.file.filename}`;
    brand.logo_url = publicPath;
    await brand.save();
    res.json({
      success: true,
      brand: {
        id: brand._id,
        logo_url: brand.logo_url,
        updatedAt: brand.updatedAt,
      },
    });
  } catch (e) {
    next(e);
  }
};

// @route   GET /api/brands/:brandId
exports.getBrand = async (req, res, next) => {
  try {
    const { brand } = await assertMember(req, req.params.brandId);

    const members = await BrandMember.find({ brand: brand._id })
      .populate('user', 'fullname email')
      .lean();

    const memberList = members.map((m) => ({
      userId: m.user._id,
      fullname: m.user.fullname,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    const myMembership = members.find(
      (m) => m.user._id.toString() === req.user._id.toString()
    );

    res.json({
      success: true,
      brand: {
        id: brand._id,
        name: brand.name,
        city: brand.city,
        country: brand.country,
        businessType: brand.businessType || '',
        description: brand.description,
        logo_url: brand.logo_url || '',
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
      },
      myRole: myMembership?.role,
      members: memberList,
    });
  } catch (e) {
    next(e);
  }
};

// @route   PATCH /api/brands/:brandId
exports.updateBrand = async (req, res, next) => {
  try {
    const { brand } = await assertAdmin(req, req.params.brandId);
    const { name, city, country, description } = req.body;

    if (!Object.prototype.hasOwnProperty.call(req.body, 'businessType')) {
      return next(createError(400, 'Business type is required'));
    }
    const bt = typeof req.body.businessType === 'string' ? req.body.businessType.trim() : '';
    if (!bt) {
      return next(createError(400, 'Business type cannot be empty'));
    }
    if (bt.length > 120) {
      return next(createError(400, 'Business type must be at most 120 characters'));
    }
    brand.businessType = bt;

    if (name !== undefined) brand.name = name;
    if (city !== undefined) brand.city = city;
    if (country !== undefined) brand.country = country;
    if (description !== undefined) brand.description = description;

    await brand.save();

    res.json({
      success: true,
      brand: {
        id: brand._id,
        name: brand.name,
        city: brand.city,
        country: brand.country,
        businessType: brand.businessType || '',
        description: brand.description,
        logo_url: brand.logo_url || '',
        updatedAt: brand.updatedAt,
      },
    });
  } catch (e) {
    next(e);
  }
};

// @route   POST /api/brands/:brandId/members
exports.addMemberByEmail = async (req, res, next) => {
  try {
    await assertAdmin(req, req.params.brandId);
    const brandId = req.params.brandId;

    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) {
      return next(createError(400, 'Email is required'));
    }

    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return next(
        createError(404, 'No user with that email. They must sign up first.')
      );
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return next(createError(400, 'You are already a member of this brand'));
    }

    try {
      await BrandMember.create({
        brand: brandId,
        user: targetUser._id,
        role: 'member',
      });
    } catch (err) {
      if (err.code === 11000) {
        return next(createError(400, 'That user is already a member'));
      }
      throw err;
    }

    res.status(201).json({
      success: true,
      member: {
        userId: targetUser._id,
        fullname: targetUser.fullname,
        email: targetUser.email,
        role: 'member',
      },
    });
  } catch (e) {
    next(e);
  }
};

// @route   DELETE /api/brands/:brandId/members/:userId
exports.removeMember = async (req, res, next) => {
  try {
    await assertAdmin(req, req.params.brandId);
    const { brandId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(createError(400, 'Invalid user id'));
    }

    const target = await BrandMember.findOne({
      brand: brandId,
      user: userId,
    });

    if (!target) {
      return next(createError(404, 'Member not found'));
    }

    if (userId === req.user._id.toString()) {
      return next(createError(400, 'You cannot remove yourself from the brand'));
    }

    if (target.role === 'admin') {
      const adminCount = await BrandMember.countDocuments({
        brand: brandId,
        role: 'admin',
      });
      if (adminCount <= 1) {
        return next(
          createError(400, 'Cannot remove the only admin. Transfer ownership first or add another admin.')
        );
      }
    }

    await BrandMember.deleteOne({ _id: target._id });

    res.json({ success: true, message: 'Member removed' });
  } catch (e) {
    next(e);
  }
};
