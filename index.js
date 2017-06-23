'use strict';

process.env.DEBUG = 'actions-on-google:*';
const App = require('actions-on-google').ApiAiApp;
const moment = require('moment');
var fetch = require('node-fetch');
moment.locale('fr');

const NAME_ACTION = 'celebrationtime';

// [START messesinfo]
exports.messesinfo = (request, response) => {
  const app = new App({request, response});
  console.log('Request headers: ' + JSON.stringify(request.headers));
  console.log('Request body: ' + JSON.stringify(request.body));

  function getArgument(app, name) {
    let value = app.getArgument(name);
    if (!value) {
      let contextArg = app.getContextArgument('next', name)
      if (contextArg) {
        value = contextArg.value;
      }
    }
    return value;
  }

  function buildQuery(app) {
    let query = [];
    let city = getArgument(app, 'city');
    if (city) {
      query.push(city);
    }
    let date = getArgument(app, 'date');
    if (date) {
      query.push(moment(date).format('DD/MM/YYYY'));
    }
    let solemnities = getArgument(app, 'solemnities');
    if (solemnities) {
      query.push(solemnities);
    }
    let celebrationtype = getArgument(app, 'celebrationtype');
    if (celebrationtype) {
      query.push(celebrationtype);
    }
    let liturgieshours = getArgument(app, 'liturgieshours');
    if (liturgieshours) {
      query.push(liturgieshours);
    }
    let zipcode = getArgument(app, 'zipcode');
    if (zipcode) {
      query.push(zipcode);
    }
    let diocese = getArgument(app, 'diocese');
    if (diocese) {
      query.push('network:'+diocese);
    }
    let parish = getArgument(app, 'parish');
    if (parish) {
      query.push('paroisse '+parish);
    }
    let church = getArgument(app, 'church');
    if (church) {
      query.push('eglise '+church);
    }
    let location = getArgument(app, 'location');
    if (location) {
      query.push('ville '+location);
    }
    let tag = getArgument(app, 'tags');
    if (tag) {
      query.push(tag);
    }
    let department = getArgument(app, 'department') || app.getSelectedOption ();
    if (department) {
      query.push(department);
    }
    let queryStr = query.join(" ");
    console.info(queryStr);
    return encodeURIComponent(queryStr);
  }

  // Call MessesInfo search
  function search (app, page) {
    return new Promise(function (resolve, reject) {
      var formatedDate = '';
      var query = buildQuery(app).trim();
      if (query.length === 0) {
        resolve(app.ask("Quand quel ville voulez vous avoir l'horaire de messe ?"));
      }
      else {
        var url = 'http://eglise-info.appspot.com/horaires/'+query+'.json?limit=1&start='+page;
        console.info(url);
        fetch(url)
        .then(res => res.json())
        .then(body => {
          if (body) {
              if (body.type == "CELEBRATIONTIME") {
                var res = body.listCelebrationTime[0];
                var formatedDate = moment(res.date).format('LL');
                resolve(app.tell(`La messe le ${formatedDate} dans ${res.locality.type} ${res.locality.name} à ${res.locality.city} est à ${res.time}`));
              }
              else if (body.type == "DEPARTMENT") {
                var departements = body.listDepartment.map(dep => dep.department);
                resolve(app.askWithList('Dans quel département ? ' + departements.slice(0, -1).join(',')+' ou '+departements.slice(-1),
                  app.buildList('Département').addItems(body.listDepartment.map(dep => app.buildOptionItem(dep.department, [dep.department, dep.label]).setTitle(dep.label)))));
              }
              else if (body.type == "LOCATION") {
                  resolve(app.tell(`Votre recherche ne trouve aucun lieu, essayez une autre recherche`));
              }
              else {
                  resolve(app.tell(`Pas d\'horaire disponible pour votre demande`));
              }
          }
          else {
            console.log("error");
            resolve(app.tell('Oops, un petit problème :' + error));
          }
        })
        .catch(error => {
          console.log(error);
          resolve(app.tell('Oops, un petit problème :' + error));
        });
      }
    });
  }

  function messesLocality(app) {
      app.setContext('next', 1, {page: 0});
      search(app, 0);
  }

  function messesLocalityNext(app) {
      let page = app.getContextArgument('page', 'page') || 0;
      page++;
      app.setContext('next', 1, {page: page});
      search(app, page);
  }

  let actionMap = new Map();
  actionMap.set("celebrationtime", messesLocality);
  actionMap.set("celebrationtime-next", messesLocalityNext);
  actionMap.set("option.select", messesLocality);

  app.handleRequest(actionMap);
};
// [END messesinfo]
