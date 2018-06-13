let MongoClient = require('mongodb').MongoClient;

class setAttractionDistanceWiseClass {
    constructor(url, collectionName, records) {
        this.url = url;
        this.collectionName = collectionName;
        this.records = records;
    }

    sortCollectionDistanceWise(db, collectionName, cords) {
        try {
            return new Promise((resolve, reject) => {
                db.collection(collectionName).find({
                    coords: {
                        $near: {
                            $geometry: { type: "Point", coordinates: cords },
                            $minDistance: 0,

                        }
                    }
                }, { attractionId: 1, attractionName: 1, attractionRating: 1, coords: 1, attractionCountry: 1, attractionState: 1, attractionCityName: 1, attractionCityId: 1, attractionVisitDuration: 1, attractionDescription: 1, isKidFriendly: 1, B: 1, R: 1, I: 1, C: 1, E: 1, attractionImage: 1, isAttractionActive: 1, visitTime: 1, attractionTravelTheme: 1, attractioncategory: 1, deals: 1, visitorFee: 1, attractionVisitFeeCurrency: 1 }).toArray(function(err, result) {
                    if (!err) {
                        resolve(result);
                    } else {
                        reject(result);
                    }
                })

            })
        } catch (error) {

        }
    }


    setIndex(db, collectionName) {
        try {
            return new Promise((resolve, reject) => {
                db.collection(collectionName).createIndex({ coords: "2dsphere" }, (err, result) => {
                    if (!err) {
                        resolve(result);
                    } else {
                        reject("some issue occure");
                    }
                });
            })
        } catch (error) {

        }
    }


    insertDocument(db, collectionName, records) {
        try {
            return new Promise((resolve, reject) => {
                if (records.length > 0) {
                    var correctCoordOrder = {};
                    records.forEach(function(attraction, index) {
                        var coordsOrder = records[index].coords
                        correctCoordOrder = { "lng": records[index].coords.lng, "lat": records[index].coords.lat };
                        records[index].coords = correctCoordOrder;

                    }, this);
                    db.collection(collectionName).insertMany(records, (er, result) => {
                        resolve(result);
                    });
                } else {
                    resolve([]);
                }
            })
        } catch (error) {
            console.log(error);
        }
    }

    removeTempDocument(db, collectionName, resultSet) {
        try {
            return new Promise((resolve, reject) => {
                db.collection(collectionName).drop().then((result) => {
                    resolve(resultSet);
                })
            })
        } catch (error) {

        }
    }

    processForSorting() {
        try {
            return new Promise((resolve, reject) => {
                MongoClient.connect(this.url, (err, db) => {
                    console.log("Connected correctly to server");
                    this.setIndex(db, this.collectionName).then((result) => {
                        this.insertDocument(db, this.collectionName, this.records).then((data) => {
                            if (this.records.length !== 0) {
                                let coords = [this.records[0].coords.lng, this.records[0].coords.lat];
                                this.sortCollectionDistanceWise(db, this.collectionName, coords).then((result) => {
                                    this.removeTempDocument(db, this.collectionName, result).then((result) => {
                                        db.close();
                                        resolve(result);
                                    })
                                });
                            }
                        });
                    });
                });
            })
        } catch (error) {
            console.log(error)
        }
    }
}

module.exports = setAttractionDistanceWiseClass;