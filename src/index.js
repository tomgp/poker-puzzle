import {select, selectAll, mouse} from 'd3';
import { newGame, event } from './game.js';
import {handDescriptions} from './hand-descriptions.js';

const g = newGame();

function clamp(n,min,max){
  let val = Math.max(n, min);
  return Math.min(val, max);
}

function placeCard(targetSpace){
  const t = select(targetSpace); 
  const snapTo = {x:0, y:0};
  const activeCard = select('.active.card');
  activeCard.classed('dragging',false);
  if(t && t.node() && !t.classed('occupied')){
    //add the card as a child of that space;
    t.classed('occupied', true);
    t.node().appendChild(activeCard.node());
    activeCard.classed('active', false);
    activeCard.classed('placed', true);
    activeCard.on('mousedown', null);
    dragTargets.classed('targeted', false);
    cardPlaced(t.node().dataset.row, t.node().dataset.col);
  }
  activeCard
    .style('left', `${snapTo.x}px`)
    .style('top', `${snapTo.y}px`);
}

function moveFocus(direction, currentLocation){
  const row = clamp(Number(currentLocation.row)+ direction[1], 0, 2);
  const col = clamp(Number(currentLocation.col) + direction[0], 0, 4);
  select(`[data-row="${row}"][data-col="${col}"]`).node().focus();
}

function keyBoardListener(){
  this.addEventListener('keydown',(ev)=>{
    switch (ev.keyCode) {
      case 13:
        placeCard(ev.target);
        break;
      case 32:
        placeCard(ev.target);
        break;
      case 38: //up
        moveFocus([0,-1], ev.target.dataset);
        break;
      case 40: //down
        moveFocus([0,1], ev.target.dataset);
        break;
      case 37: //left
        moveFocus([-1,0], ev.target.dataset);
        break;
      case 39: //right
        moveFocus([1,0], ev.target.dataset);
        break;
      default:
        console.log(ev.keyCode);
        break;
    }
  });
}

function updateCardDeck(add){
  if(add != undefined){
    g.addCardsToDeck(add);
  }

  const deckJoin = select('.deck')
    .selectAll('.face-down.card')
      .data(g.getDeck());

  deckJoin.enter()
    .append('div')
    .attr('class','face-down card');

  deckJoin.exit()
    .remove();

  select('.deck')
    .selectAll('.face-down.card')
    .style('top', (d, i) => `${-i}px`);

  select('.remaining-count')
    .text(()=>{
      if(g.getDeck().length < 10){
        return `0${g.getDeck().length}`
      }
      return g.getDeck().length;
    });
}

function drawCard(){
  // take the top card from the deck array
  // create a dom node
  // append it to the deck-container
  const drawnCard = g.drawCard();
  if(!drawnCard){ return false; }

  return select('.card-container')
    .append('div')
    .call(parent=>{
      parent.attr('class', 'active card')
        .attr('data-code', drawnCard.code);

      parent.append('img')
        .attr('src',`images/${drawnCard.code}.svg`)
        .attr('draggable','false');
    });
}

function removeRow(i){
  const rowElements = selectAll(`[data-row="${i}"]`);
  rowElements.classed('occupied', false);
  rowElements.selectAll('.card.placed')
    .transition()
    .duration(500)
    .style('opacity', 0)
    .style('transform', d=>`translateZ(0) translateY(100px) rotate(${Math.random() * 0.3 - 0.15}turn)`)
    .on('end', ()=>{/* transition done */})
    .remove();
}

function updateScore(score, checklist){
  const lastHand = score.handHistory[score.handHistory.length - 1];

  select('.total-score')
    .text(`Score: ${Number(score.total).toLocaleString()}`);

  if(lastHand){
    select('.last-score')
      .html(`${lastHand.name} &ndash; ${ Number(lastHand.score.points).toLocaleString()} (+${lastHand.score.cards} cards)`);
  }

  const checkListMarkup = Object.entries(g.getChecklist())
    .map(([handName, complete])=>`<span data-handname="${handName}" class="hand-check-item ${(complete ? 'done' : 'todo' )}">${handName}</span>`)
    .join(' &ndash; ');

  select('.hand-record')
    .html(checkListMarkup);
  
  selectAll('span[data-handname]')
    .each(function(){

      select(this).on('mouseover', function(){
        handDescriptions[this.dataset.handname];
        const rect = select('.hand-record').node()
          .getBoundingClientRect();

        select('.tooltip')
          .style('display','block')
          .style('top', `${ rect.top + rect.height }px`)
          .style('left', `${ rect.left }px`)
          .style('width', `${rect.width}px`)
          .style('opacity', 1)
          .html(`<span class="tooltip-title">${this.dataset.handname}:</span> ${handDescriptions[this.dataset.handname]}`);
      });

      select(this).on('mouseout', function(){
        select('.tooltip')
          .style('opacity', 0)
          .style('z-index', 0);
          //.style('display', 'none');
      });
    });
}

const mouseWithin = (node) => {
  const loc = mouse(select('body').node());
  const rectangle = node.getBoundingClientRect();
  const rectanglePosition = [
    rectangle.x+window.scrollX,
    rectangle.y+window.scrollY
  ];
  return (
    ( loc[0] > rectanglePosition[0]  &&  loc[0] < rectanglePosition[0] + rectangle.width )
    &&
    ( loc[1] > rectanglePosition[1]  &&  loc[1] < rectanglePosition[1] + rectangle.height )
  );
}

const dragging = {
  on: false,
  origin: {},
  currentTarget: undefined,
};

let dragTargets;

function startDrag(){
  dragging.on = true; //pageX
  const globalLocation = mouse(select('body').node());
  
  dragging.origin.x = globalLocation[0];
  dragging.origin.y = globalLocation[1];
  select('.active.card')
    .classed('dragging',true);
}

function drag(){
  if(dragging.on){
    const currentlocation = mouse(select('body').node());
		const offset = {
      x: currentlocation[0] - dragging.origin.x,
      y: currentlocation[1] - dragging.origin.y
    }

    dragTargets.classed('targeted', function(){ return mouseWithin(this) })

    select('.active.card')
      .classed('dragging',true)
      .style('left', `${offset.x}px`)
      .style('top', `${offset.y}px`);
  }
}

function stopDrag(){
  dragging.on = false;
  const t = select('.targeted');
  placeCard(t.node());
}

function cardPlaced(row, col){
  // put the current table state into a data structure for
  // testing for complete rows etc.
  selectAll('.card-space')
    .each(function(){
      const coords = this.dataset;
      const placedCard = select(this).select('.card');
      if(placedCard.node()){
        const cardData = placedCard.node().dataset;
        g.setCard(coords.row, coords.col, cardData.code);
      }
    });

  const rowResult = g.scoreRow(row);
  if(rowResult){
    updateCardDeck(rowResult.score.cards);
    updateScore(g.getScore(), g.getChecklist());
  } else {
    updateCardDeck();
  }

  const clear = g.clearRows();

  if(clear.score > 0){
    updateScore(g.getScore(), g.getChecklist());
  }

  clear.rowsCleared.forEach((remove, i)=>{
    if(remove){
      removeRow(i)
    };
  });

  const newCard = drawCard();

  if(!newCard){
    console.log('gameOver')
    //clear board and say game over
  }else{
    addDragListeners(newCard);
    // set the drag targets to available spaces
    dragTargets = selectAll('.card-space:not(.occupied)');
  }
}

function addDragListeners(targetNode){
  select('body').on('mouseup', stopDrag)
    .on('mouseup', stopDrag)  
    .on('touchend', stopDrag)  
    .on('mousemove', drag);


  targetNode.on('touchmove', drag)
    .on('mousemove', drag)
    .on('mousedown', startDrag)
    .on('touchstart', startDrag);
  
}

const main = () => {
  updateCardDeck(32);
  const newCard = drawCard();
  updateScore(g.getScore(), g.getChecklist());
  addDragListeners(newCard);
  dragTargets = selectAll('.card-space:not(.occupied)');
  //add a keyboard listener for 'return' to add a card to the currently selected space
  dragTargets.each(keyBoardListener);
}

window.onload = main;