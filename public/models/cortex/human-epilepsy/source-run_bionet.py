
import sys
from bmtk.simulator import bionet
from neuron import h
from bmtk.simulator.bionet.pyfunction_cache import add_cell_processor
from bmtk.simulator.bionet.default_setters.cell_models import set_params_allactive


def run(config_file):
    conf = bionet.Config.from_json(config_file, validate=True)
    conf.build_env()

    graph = bionet.BioNetwork.from_config(conf)
    sim = bionet.BioSimulator.from_config(conf, network=graph)
    sim.run()
    bionet.nrn.quit_execution()


def fix_axon_allactive_granule(hobj):
   """Replace reconstructed axon with a stub
   Parameters
   ----------
   hobj: instance of a Biophysical template
       NEURON's cell object
   """
   # find the start and end diameter of the original axon, this is different from the perisomatic cell model
   # where diameter == 1.
   axon_diams = [hobj.axon[0].diam, hobj.axon[0].diam]
   h.distance(sec=hobj.soma[0])   # need this to set all distances relative to soma (not sure if from center?)
   for sec in hobj.all:
      section_name = sec.name().split(".")[1][:4]
      if section_name == 'axon':
          for seg in sec:
            if h.distance(seg.x) > 60:
              axon_diams[1] = sec.diam
          #if h.distance(0.5, sec) > 60:
          #    axon_diams[1] = sec.diam

   for sec in hobj.axon:
       h.delete_section(sec=sec)

   h.execute('create axon[2]', hobj)
   for index, sec in enumerate(hobj.axon):
       sec.L = 30
       sec.diam = axon_diams[index]  # 1

       hobj.axonal.append(sec=sec)
       hobj.all.append(sec=sec)  # need to remove this comment

   hobj.axon[0].connect(hobj.soma[0], 1.0, 0)
   hobj.axon[1].connect(hobj.axon[0], 1.0, 0)

   h.define_shape()


def aibs_allactive_granule(hobj, cell, dynamics_params):
    # Write custom function for replacing axon with stub
    # custom_axons_cut(hobj)
    #if cell.morphology_file.endswith('0704.swc'):
    #    print 'HERE'
    # print cell.morphology_file
    fix_axon_allactive_granule(hobj)
    set_params_allactive(hobj, dynamics_params)
    # if cell.morphology_file.endswith('0704.swc'):
    #    print 'done'

    # print 'done'
    return hobj
add_cell_processor(aibs_allactive_granule)


if __name__ == '__main__':
    if __file__ != sys.argv[-1]:
        run(sys.argv[-1])
    else:
        run('config.json')

