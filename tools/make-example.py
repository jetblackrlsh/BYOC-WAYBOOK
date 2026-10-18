import json,pathlib
r=pathlib.Path(__file__).resolve().parents[1]
def node(id,title,hero,villain,chaos,obstacle,success,failure,**kw):
 return dict(id=id,title=title,prompts=dict(heroic=hero,villainous=villain,chaotic=chaos),obstacle=obstacle,success=success,failure=failure,**kw)
def go(text,next,**kw):return dict(text=text,next=next,**kw)
a=dict(schema='BYOCAdventure',version=1,id='last-lantern',title='The Last Lantern',author='Dot Nova',introduction='A storm is swallowing the harbor of Bellwake. Its lighthouse has gone dark, and the last ferry is approaching the reef. Bring any character you can imagine. Describe how they act; the same three-stat rules govern every approach.',start='quay',circumstances=[
 dict(id='chart',name='A glimpse of the keeper’s chart',stat='mind',modifier=1,duration=3),
 dict(id='soaked',name='Waterlogged and shivering',stat='body',modifier=-1,duration=2),
 dict(id='spark',name='Borrowed lantern spark',stat='special',modifier=1,duration=2)],
 sections=[
 node('quay','The Empty Quay','The ferry carries people who need your help. You set out to relight the tower.','The harbor council offers a fortune to whoever restores the light. You intend to collect.','A storm, a dark tower, and an audience on a ferry: this promises a memorable entrance.','The causeway is flooding. Find a way across before the next wave.',
 go('You cross dry-footed and glimpse a useful maintenance chart.','bridge',grants=[dict(id='chart')]),
 go('A wave knocks you into the reeds. You survive, soaked, but the direct route is gone.','reeds',grants=[dict(id='soaked')]),
 checkpoint=True),
 node('bridge','The Broken Span','A dockhand is stranded beside the broken bridge. You refuse to leave them behind.','A dockhand knows where the reward is kept. Their information is worth a detour.','The dockhand’s disbelief at your arrival is delightful. Now for a bigger surprise.','The last stretch of bridge falls away. Reach the tower entrance.',
 go('You secure a route to the tower and arrive with a brass access token.','tower',items=dict(add=['Brass access token'])),
 go('The span gives way. You reach a lower ledge, forced to find another entrance.','hatch')),
 node('reeds','Through the Reeds','A frightened marsh creature shows you a sheltered route when you approach gently.','The marsh creature’s trail may save precious time and preserve your claim to the reward.','The reeds echo every noise. You turn the confusion into a spectacular diversion.','Find the tower through flooded channels before the rising water closes them.',
 go('You find the service hatch above the waterline.','hatch'),
 go('You claw back to the quay. The ferry is closer; you must try again.','quay')),
 node('hatch','The Keeper’s Hatch','A weary keeper calls through the jammed hatch. You offer reassurance while working it open.','The keeper can validate your reward claim. Opening this hatch serves you both.','You announce yourself through the hatch with theatrical confidence. The keeper is baffled.','Open or bypass the hatch without losing your footing.',
 go('The hatch opens and the keeper passes you a glowing reserve spark.','tower',grants=[dict(id='spark')]),
 go('The ledge crumbles. You scramble back onto the bridge, empty-handed.','bridge')),
 node('tower','Inside the Lantern Tower','You hear the ferry bell. Every moment you save may protect someone aboard.','The promised reward feels almost within reach. You will not surrender it now.','Your shadow fills the stairwell. This is the perfect place for a dramatic ascent.','The spiral stair is broken. Reach the lantern chamber above.',
 go('You reach the lantern chamber as the ferry enters the outer channel.','lantern'),
 go('A collapsing step sends you back toward the service hatch. You survive but must approach again.','hatch'),
 checkpoint=True),
 node('lantern','The Last Light','You picture the people aboard the ferry and commit everything to guiding them home.','You picture the council paying your reward and commit everything to claiming this victory.','You picture every face turning toward your impossible light and commit to the grand finale.','Restore the beacon before the ferry strikes the reef. This is a Finale with a Fatal failure.',
 go('The beacon blazes. The ferry turns clear of the reef. Bellwake will remember the stranger who brought back its light.','WIN'),
 go('The chamber collapses before the light catches. Your adventure ends in the storm. You may retry from your checkpoint or begin again.','GAME_OVER'),finale=True,fatal=True)])
(r/'examples/last-lantern.json').write_text(json.dumps(a,indent=2)+'\n')
c=dict(schema='BYOCCharacter',version=1,name='Rowan',concept='A wandering clockwork gardener who grows living bridges.',personality='heroic',stats=dict(mind=1,body=0,special=1))
(r/'examples/rowan.json').write_text(json.dumps(c,indent=2)+'\n')
