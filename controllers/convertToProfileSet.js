"use strict";
let _ = require('lodash');
let events = require('events');

let EventEmitter = require('event-emitter-es6');

class convertToProfileSet extends EventEmitter {

    constructor() {
        super();
        //FillGroupType()
    }

    convertToKeyVal(attributeSet) {
        return new Promise((resolve, reject) => {
            try {
                let attributeSets = [];
                _.each(attributeSet, (item, key) => {
                    let attribute = {};
                    attribute['key'] = key;
                    attribute['val'] = parseInt(item);
                    attribute['weight'] = 0;
                    attribute['combinekey'] = "";
                    attributeSets.push(attribute);
                });
                //resolve(_.orderBy(attributeSets, ['val'], ['desc']))
                resolve(_.orderBy(attributeSets, ['val', 'key'], ['desc']))

            } catch (error) {
                reject(error);
            }

        });
    }

    convertToKeyValwithWeight(keySet) {
        return new Promise((resolve, reject) => {
            try {
                _.each(keySet, (keyitem, index) => {
                    keyitem.weight = index;
                });
                resolve(keySet);
            } catch (error) {
                reject(error);
            }

        });
    }

    prepareSeries(keySet) {
        let seriesSet = []
        return new Promise((resolve, reject) => {
            try {
                _.each(keySet, (keyitem, index) => {
                    this.createSeries(keyitem, seriesSet);
                });
                resolve(seriesSet);
            } catch (error) {
                reject(error);
            }

        });
    }

    createSeries(keyItem, seriesSet) {
        seriesSet.push(keyItem)
        for (let ctr = keyItem.val - 1; ctr >= 0; ctr--) {
            let freashKeyItem = _.clone(keyItem);
            freashKeyItem.val = ctr;
            seriesSet.push(freashKeyItem)
        }
    }

    getKey(value) {
        let combineKey = ""
        switch (value) {
            case 5:
                combineKey = "A1";
                break;
            case 4:
                combineKey = "A2";
                break;
            case 3:
                combineKey = "A3";
                break;
            case 2:
                combineKey = "A4";
                break;
            case 1:
                combineKey = "A5";
                break;
            case 0:
                combineKey = "A6";
                break;
        }
        return combineKey;
    }

    FillGroupType(seriesSet) {
        return new Promise((resolve, reject) => {
            try {
                _.each(seriesSet, (gItem) => {
                    gItem.combinekey = this.getKey(gItem.val)
                })
                resolve(_.sortBy(seriesSet, ["combinekey", "weight"]));
            } catch (error) {
                reject(error);
            }
        });
    }

    setSequence(attributeSet, resultSet) {
        return new Promise((resolve, reject) => {
            this.convertToKeyVal(attributeSet).then((keyList) => {
                this.convertToKeyValwithWeight(keyList).then((keyListWithWeight) => {
                    this.prepareSeries(keyListWithWeight).then((seriesSet) => {
                        this.FillGroupType(seriesSet).then((resultSet) => {
                            resolve(resultSet)
                        })
                    });
                })
            });
        });
    }

}

module.exports = convertToProfileSet;