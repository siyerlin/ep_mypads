/**
* # Group Model
*
*  ## License
*
*  Licensed to the Apache Software Foundation (ASF) under one
*  or more contributor license agreements.  See the NOTICE file
*  distributed with this work for additional information
*  regarding copyright ownership.  The ASF licenses this file
*  to you under the Apache License, Version 2.0 (the
*  "License"); you may not use this file except in compliance
*  with the License.  You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing,
*  software distributed under the License is distributed on an
*  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
*  KIND, either express or implied.  See the License for the
*  specific language governing permissions and limitations
*  under the License.
*/

module.exports = (function () {
  'use strict';

  // Dependencies
  var ld = require('lodash');
  var cuid = require('cuid');
  var storage = require('../storage.js');
  //var conf = require('../configuration.js');
  var common = require('./common.js');

  /**
  * ## Description
  *
  * Groups belong to users. Each user can have multiple groups of pads.
  * DBPREFIX is fixed for database key work.
  */

  var group = { DBPREFIX: 'mypads:group:' };

  /**
  * ## Public Functions
  *
  * ### add
  *
  * Adding checks the fields, throws error if needed, set defaults options. As
  * arguments, it takes mandatory :
  *
  * - `params` object, with
  *
  *   - a `name` string that can't be empty
  *   - an `admin` string, the unique key identifying the initial administrator
  *   of the group
  *   - `visibility`, a string defined as *restricted* by default to invited
  *   users. Can be set to *public*, letting non authenticated users access to
  *   all pads in the group with the URL, or *private*, protected by a password
  *   phrase chosen by the administrator
  *   - `readonly`, *false* on creation. If *true*, pads that will be linked to
  *   the group will be set on readonly mode
  *   - `password` string field, only usefull if visibility fixed to private,
  *   by default to an empty string
  *
  * - `callback` function returning error if error, null otherwise and the
  *   group object;
  * - a special `edit` boolean, defaults to *false* for reusing the function for
  *   set (edit) an existing group.
  *
  * `add` sets other defaults
  *
  * - an empty `pads` array, will contain ids of pads attached to the group
  * - an empty `users` array, with ids of users invited to read and/or edit the
  *   pad, for restricted visibility only
  *
  *   Finally, a group object can be represented like :
  *
  * var group = {
  *   _id: 'autoGeneratedUniqueString',
  *   name: 'group1',
  *   pads: [ 'padkey1', 'padkey2' ],
  *   admins: [ 'userkey1', 'userkey2' ],
  *   users: [ 'ukey1' ],
  *   visibility: 'restricted' || 'public' || 'private',
  *   password: 'secret',
  *   readonly: false
  * };
  *
  */

  group.add = function (params, callback) {
    common.addSetInit(params, callback);
    var isFullStr = function (s) { return (ld.isString(s) && !ld.isEmpty(s)); };
    if (!(isFullStr(params.name) && isFullStr(params.admin))) {
      throw(new TypeError('name and admin must be strings'));
    }
    var g = group.fn.assignProps(params);
    var _final = function () {
      var allKeys = ld.union(g.admins, g.users, g.pads);
      common.checkMultiExist(allKeys, function (err, res) {
        if (err) { return callback(err); }
        if (!res) {
          var e = 'Some users, admins or pads have not been found';
          return callback(new Error(e));
        }
        storage.db.set(group.DBPREFIX + g._id, g, function (err) {
          if (err) { return callback(err); }
          group.fn.indexUsersAndPads(false, g, function (err) {
            if (err) { return callback(err); }
            return callback(null, g);
          });
        });
      });
    };
    if (params._id) {
      g._id = params._id;
      common.checkExistence(group.DBPREFIX + g._id, function (err, res) {
        if (err) { return callback(err); }
        if (!res) { return callback(new Error('group does not exist')); }
        _final();
      });
    } else {
      g._id = cuid();
      _final();
    }
  };

  /**
  * ### get
  *
  *  Group reading
  *
  *  This function uses `common.getDel` with `del` to *false* and DBPREFIX
  *  fixed.  It will takes mandatory key string and callback function. See
  *  `common.getDel` for documentation.
  */

  group.get = ld.partial(common.getDel, false, group.DBPREFIX);

  /**
  * ### set
  *
  *  The modification of a group can be done for every field.
  *  In fact `group.add` with special attribute `add` to *false*.
  *  Please refer to `group.add` for documentation.
  */

  group.set = group.add;

  /**
  * ### del
  *
  * Group removal
  *
  *  This function uses `common.getDel` with `del` to *false* and DBPREFIX
  *  fixed.  It will takes mandatory key string and callback function. See
  *  `common.getDel` for documentation.
  *
  *  It uses the `callback` function to handle secondary indexes for users and
  *  pads.
  */

  group.del = function (key, callback) {
    if (!ld.isFunction(callback)) {
      throw(new TypeError('callback must be a function'));
    }
    common.getDel(true, group.DBPREFIX, key, function (err, g) {
      if (err) { return callback(err); }
      group.fn.indexUsersAndPads(true, g, callback);
    });
  };

  /**
  *  ## Helper Functions
  *
  *  Helper here are public functions created to facilitate interaction with
  *  the API.
  *  TODO : may be written to improve API usage
  */

  group.helper = {};

  /**
  * ### linkPads
  *
  *  `linkPads` is a function to attach new pads to an existing group.
  *  It takes mandatory arguments :
  *
  *  - the pad `_id`entifier, a string
  *  - `add`, a string for only one addition, an array for multiple adds.
  */

  group.helper.linkPads = ld.noop;

  group.helper.unlinkPads = ld.noop;

  /**
  * ### inviteUsers
  * string or array
  */

  group.helper.inviteUsers = ld.noop;

  /**
  * ### setAdmins
  * string or array
  */

  group.helper.setAdmins = ld.noop;

  /**
  * ### setPassword
  * string of false
  */

  group.helper.setPassword = ld.noop;

  /**
  * ### setPublic
  * boolean
  */

  group.helper.setPublic = ld.noop;

  /**
  * ### archive
  * boolean
  */

  group.helper.archive = ld.noop;

  /**
  *  ## Internal Functions
  *
  *  All are tested through public API.
  */

  group.fn = {};

  /**
  * ### assignProps
  *
  * `assignProps` takes params object and assign defaults if needed.
  * For performance reasons, it won't check existence for all pads, users,
  * admins given.
  * It creates :
  *
  * - an `admins` array, unioning admin key to optional others admins,
  * - a `users` array, empty or with given keys,
  * - a `pads` array, empty or with given keys,
  * - a `visibility` string, defaults to *restricted*, with only two other
  *   possibilities : *private* or *public*
  * - a `password` string, *null* by default
  * - a `readonly` boolean, *false* by default
  *
  * It returns the group object.
  */

  group.fn.assignProps = function (params) {
    var p = params;
    var g = { name: p.name };
    p.admins = ld.isArray(p.admins) ? ld.filter(p.admins, ld.isString) : [];
    g.admins = ld.union([ p.admin ], p.admins);
    ld.forEach(['pads', 'users'], function (k) { g[k] = ld.uniq(p[k]); });
    var v = p.visibility;
    var vVal = ['restricted', 'private', 'public'];
    g.visibility = (ld.isString(v) && ld.includes(vVal, v)) ? v : 'restricted';
    g.password = ld.isString(p.password) ? p.password : null;
    g.readonly = ld.isBoolean(p.readonly) ? p.readonly : false;
    return g;
  };

  /**
  * ### indexUsersAndPads
  *
  * `indexUsersAndPads` is an asynchronous function which handles secondary
  * indexes for *users.groups* and *pad.group* after group creation. It takes :
  *
  * - a `del` boolean to know if we have to delete key from index or add it
  * - the `group` objectwith
  * - a `callback` function, returning Error or *null* if succeeded
  */

  group.fn.indexUsersAndPads = function (del, group, callback) {
    // TODO: pads
    var users = ld.union(group.admins, group.users);
    ld.forEach(users, function (ukey) {
      storage.db.get(ukey, function (err, u) {
        if (err) { return callback(err); }
        if (del) {
          ld.pull(u.groups, group._id);
        } else {
          u.groups.push(group._id);
        }
        storage.db.set(ukey, u, function (err) {
          if (err) { return callback(err); }
          callback(null);
        });
      });
    });
  };

  return group;


}).call(this);
