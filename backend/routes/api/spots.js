const express = require("express");
const { setTokenCookie, requireAuth } = require("../../utils/auth");
const {
  User,
  Booking,
  Review,
  ReviewImage,
  Spot,
  SpotImage,
  sequelize,
} = require("../../db/models");
const {validQuery} = require('../../utils/validation');
const router = express.Router();

router.get("/", async (req, res) => {
const { options, page, size } = validQuery(req.query);
  let arr = [];

  const spots = await Spot.findAll(options);
  for (let spot of spots) {
    let sumOfStars = 0;
    const numOfReviews = await Review.count({
      where: {
        spotId: spot.id,
      },
    });
    const totalStars = await Review.findAll({
      attributes: [[sequelize.fn("sum", sequelize.col("stars")), "total"]],
      where: {
        spotId: spot.id,
      },
    });
    // console.log(totalStars[0].dataValues.total)
    let avgStars = totalStars[0].dataValues.total / numOfReviews;
    let pojo = spot.toJSON();
    pojo.avgRating = avgStars;
    const previewImg = await SpotImage.findAll({
      where: {
        preview: true,
        spotId: spot.id,
      },
    });
    if (previewImg.length) {
      pojo.previewImage = previewImg[0].dataValues.url;
      // console.log(previewImg[0].dataValues);
    }
    if (!previewImg.length) {
      pojo.previewImage = null;
    }
    arr.push(pojo);
  }
  return res.json({ Spots: arr, page, size});
});

router.get("/current", requireAuth, async (req, res) => {
  let arr = [];
  const userId = req.user.id;
  let ownedSpots = await Spot.findAll({
    where: {
      ownerId: userId,
    },
  });
  for (let spot of ownedSpots) {
    let sumOfStars = 0;
    const numOfReviews = await Review.count({
      where: {
        spotId: spot.id,
      },
    });
    const totalStars = await Review.findAll({
      attributes: [[sequelize.fn("sum", sequelize.col("stars")), "total"]],
      where: {
        spotId: spot.id,
      },
    });
    // console.log(totalStars[0].dataValues.total)
    let avgStars = totalStars[0].dataValues.total / numOfReviews;
    let pojo = spot.toJSON();
    pojo.avgRating = avgStars;
    const previewImg = await SpotImage.findAll({
      where: {
        preview: true,
        spotId: spot.id,
      },
    });
    if (previewImg.length) {
      pojo.previewImage = previewImg[0].dataValues.url;
      // console.log(previewImg[0].dataValues);
    }
    if (!previewImg.length) {
      pojo.previewImage = null;
    }
    arr.push(pojo);
  }
  return res.json({ Spots: arr });
});

router.get("/:spotId", async (req, res) => {
  let spotId = req.params.spotId;
  let spot = await Spot.findByPk(spotId);
  if (spot) {
    const numOfReviews = await Review.count({
      where: {
        spotId: spot.id,
      },
    });
    const totalStars = await Review.findAll({
      attributes: [[sequelize.fn("sum", sequelize.col("stars")), "total"]],
      where: {
        spotId: spot.id,
      },
    });
    let avgRating = totalStars[0].dataValues.total / numOfReviews;
    // console.log(avgRating);
    let spotImages = await SpotImage.findAll({
      where: {
        spotId: spotId,
      },
      // attributes: {
      //     exclude: ["createdAt", "updatedAt", "spotId"]
      // }
      attributes: ["id", "url", "preview"],
    });
    let owner = await User.findByPk(spot.ownerId, {
      attributes: ["id", "firstName", "lastName"],
    });
    let pojo = spot.toJSON();
    console.log(spotImages);
    pojo.numReviews = numOfReviews;
    pojo.avgStarRating = avgRating;
    pojo.SpotImages = spotImages;
    pojo.Owner = owner;
    return res.json(pojo);
  } else {
    return res.json({
      message: "Spot couldn't be found",
    });
  }
});

router.post("/", requireAuth, async (req, res) => {
  let errors = {};
  if (!req.body.address) {
    errors.adress = "Street address is required";
  }
  if (!req.body.city) {
    errors.city = "City is required";
  }
  if (!req.body.state) {
    errors.state = "State is required";
  }
  if (!req.body.country) {
    errors.country = "Country is required";
  }
  if (typeof req.body.lat !== "number") {
    errors.lat = "Latitude is not valid";
  }
  if (typeof req.body.lng !== "number") {
    errors.lng = "Longitude is not valid";
  }
  if (req.body.name) {
    if (req.body.name.length > 49) {
      errors.name = "Name must be less than 50 characters";
    }
  }
  if (!req.body.description) {
    errors.description = "Description is required";
  }
  if (!req.body.price) {
    errors.price = "Price per day is required";
  }
  const { address, city, state, country, lat, lng, name, description, price } =
    req.body;
  const spot = await Spot.create({
    ownerId: req.user.id,
    address,
    city,
    state,
    country,
    lat,
    lng,
    name,
    description,
    price,
  });
  if (!Object.keys(errors).length) {
    res.status(201);
    return res.json(spot);
  } else {
    res.status(400);
    return res.json({
      message: "Bad Request",
      errors,
    });
  }
});
router.post("/:spotId/images", requireAuth, async (req, res) => {
  let spotId = req.params.spotId;
  const { url, preview } = req.body;
  let spot = await Spot.findByPk(spotId);
  if (spot) {
    let spotImage = await SpotImage.create({
      url,
      preview,
      spotId
    });


    return res.json({id: spotImage.id, url: spotImage.url, preview: spotImage.preview});
  } else {
    res.status(404);
    return res.json({
      message: "Spot couldn't be found",
    });
  }
});

router.put("/:spotId", requireAuth, async (req, res) => {
  let errors = {};
  let spotId = req.params.spotId;
  let spot = await Spot.findByPk(spotId);
  if (spot) {
    if (!req.body.address) {
      errors.adress = "Street address is required";
    }
    if (!req.body.city) {
      errors.city = "City is required";
    }
    if (!req.body.state) {
      errors.state = "State is required";
    }
    if (!req.body.country) {
      errors.country = "Country is required";
    }
    if (typeof req.body.lat !== "number") {
      errors.lat = "Latitude is not valid";
    }
    if (typeof req.body.lng !== "number") {
      errors.lng = "Longitude is not valid";
    }
    if (req.body.name) {
      if (req.body.name.length > 49) {
        errors.name = "Name must be less than 50 characters";
      }
    }
    if (!req.body.description) {
      errors.description = "Description is required";
    }
    if (!req.body.price) {
      errors.price = "Price per day is required";
    }
    const {
      address,
      city,
      state,
      country,
      lat,
      lng,
      name,
      description,
      price,
    } = req.body;
    const updatedSpot = await spot.update({
      ownerId: req.user.id,
      address,
      city,
      state,
      country,
      lat,
      lng,
      name,
      description,
      price,
    });
    if (!Object.keys(errors).length) {
      res.status(200);
      return res.json(spot);
    } else {
      res.status(400);
      return res.json({
        message: "Bad Request",
        errors,
      });
    }
  } else {
    res.status(404);
    return res.json({
      message: "Spot couldn't be found",
    });
  }
});

router.delete("/:spotId", requireAuth, async (req, res) => {

  let spotId = req.params.spotId;
  let spot = await Spot.findByPk(spotId);
  if (spot) {
    await spot.destroy();
    return res.json({
      message: "Successfully deleted",
    });
  } else {
    res.status(404);
    return res.json({
      message: "Spot couldn't be found",
    });
  }
});

router.get("/:spotId/reviews", async (req, res) => {
  let arr = [];
  let spotId = req.params.spotId;
  let spot = await Spot.findByPk(spotId);
  if (spot) {
    let reviews = await Review.findAll({
      where: {
        spotId: spotId,
      },
      include: [{model: ReviewImage, attributes: ["id", "url"]}]
    });

    for (let review of reviews) {
      let pojo = review.toJSON();
      let user = await User.findOne({
        where: {
          id: review.userId,
        },
        attributes: ["id", "firstName", "lastName"],
      });
      pojo.User = user;
      arr.push(pojo);
    }

    return res.json({ Reviews: arr });
  } else {
    res.status(404);
    return res.json({
      message: "Spot couldn't be found",
    });
  }
});
router.post("/:spotId/reviews", requireAuth, async (req, res) => {
  let spotId = req.params.spotId;
  let userId = req.user.id;
  let reviewExists = await Review.findOne({
    where: {
        spotId: spotId,
        userId: userId
    }
  })

    if(reviewExists){
        res.status(500);
        return res.json({
            "message": "User already has a review for this spot"
          })
    }

  let errors = {};
  const { review, stars } = req.body;
  let spot = await Spot.findByPk(spotId);
  if (spot) {
    const newReview = await Review.create({
      userId: userId,
      spotId: spotId,
      review,
      stars,
    });
    if (!req.body.review) {
      errors.review = "Review text is required";
    }
    if (req.body.stars > 5 || req.body.stars < 1 || !req.body.stars) {
      errors.stars = "Stars must be an integer from 1 to 5";
    }
    if (!Object.keys(errors).length) {
      res.status(201);
      return res.json(newReview);
    } else {
      res.status(400);
      return res.json({
        message: "Bad Request",
        errors,
      });
    }
  } else {
    res.status(404);
    return res.json({
      message: "Spot couldn't be found",
    });
  }
});

router.get('/:spotId/bookings', requireAuth, async (req, res) => {
    let spotId = req.params.spotId;
    let arr = [];
    let userId = req.user.id;
    let spot = await Spot.findByPk(spotId);
    if(spot){
        let ownedBookings = await Booking.findAll({
            where: {
                spotId: spotId
            }
        })
        if(spot.ownerId === userId){
            for(let booking of ownedBookings){
            let pojo = booking.toJSON();
            let owner = await User.findByPk(userId,
                {
                    attributes: ["id", "firstName", "lastName"]
                });
            pojo.User = owner;
            // console.log(bookings);
                arr.push(pojo)
            }
             return res.json({"Bookings": arr});

        }
        else{
            let bookings = await Booking.findAll({
                where: {
                    spotId: spotId
                },
                attributes: ["spotId", "startDate", "endDate"]
            })
             return res.json({"Bookings": bookings});

        }

    }
    else{
        res.status(404);
        return res.json({
            message: "Spot couldn't be found"
          })
    }
})

router.post('/:spotId/bookings', requireAuth, async (req, res) => {
    let userId = req.user.id;
    let spotId = req.params.spotId;
    let {startDate, endDate} = req.body;
    let spot = await Spot.findByPk(spotId);
    if(spot){
        let errors = {};
            if(endDate<= startDate){
                res.status(400);
                 return res.json({
                    "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
                    "errors": {
                      "endDate": "endDate cannot be on or before startDate"
                    }
                  });
            }
            let bookings = await Booking.findAll();
            for(let booking of bookings){
                if(booking.startDate <=startDate && booking.endDate>=startDate){
                    errors.startDate = "Start date conflicts with an existing booking";
                }
                if(booking.startDate <=endDate && booking.endDate>=endDate){
                    errors.endDate = "End date conflicts with an existing booking";
                }
            }
            if(Object.keys(errors).length){
                res.status(403);
                 return res.json({message: "Sorry, this spot is already booked for the specified dates",
                errors})
            }
            else{
                let booking = await Booking.create({
                    spotId: spotId,
                    userId: userId,
                    startDate,
                    endDate
                })
                res.json(booking);
            }
    }
    else{
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found"
          })
    }
})
module.exports = router;
