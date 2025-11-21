// Example pirates graph data structure for Vis.js (normally fetched via API) --> again, only temporary AI code!!
var nodes = new vis.DataSet([
    {id: 1, label: 'Jack Sparrow', group: 'pirate'},
    {id: 2, label: 'Black Pearl', group: 'ship'},
    {id: 3, label: 'Will Turner', group: 'pirate'},
    {id: 4, label: 'Davy Jones', group: 'villain'},
    {id: 5, label: 'Flying Dutchman', group: 'ship'}
  ]);
  
  var edges = new vis.DataSet([
    {from: 1, to: 2, label: 'Captain'},
    {from: 3, to: 2, label: 'Crew'},
    {from: 1, to: 4, label: 'Rival'},
    {from: 4, to: 5, label: 'Captain'},
    {from: 3, to: 5, label: 'Crew'}
  ]);
  
  var container = document.getElementById('graph');
  var data = { nodes: nodes, edges: edges };
  var options = {
    nodes: {
      shape: 'image',
      brokenImage: undefined,
      image: undefined,
      color: {
        border: '#efd793',
        background: '#523a1a'
      },
      font: {
        color: '#efd793'
      }
    },
    edges: {
      color: '#efd793',
      arrows: 'to',
      font: {
        color: '#efd793'
      }
    },
    groups: {
      pirate: { color: { background: '#7c5700', border: '#efd793' } },
      ship:   { color: { background: '#3c424d', border: '#7c5700' } },
      villain:{ color: { background: '#470606', border: '#efd793' } }
    },
    physics: { stabilization: false }
  };
  var network = new vis.Network(container, data, options);
  
  // Simple search function (case-insensitive)
  function runSearch() {
    var searchValue = document.getElementById('searchInput').value.toLowerCase();
    var selected = nodes.get().filter(n => n.label.toLowerCase().includes(searchValue));
    if (selected.length) {
      network.selectNodes(selected.map(n => n.id));
    } else {
      network.unselectAll();
    }
  }  
