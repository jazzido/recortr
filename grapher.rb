require 'cairo'

class WaveGrapher
  
  PADDING_X = 0
  PADDING_Y = 10
  SURFACE_WIDTH = 788
  SURFACE_HEIGHT = 140
  SAMPLE_RATE = 7350
  
  attr_accessor :input_mp3, :samples, :samples_c
  attr_reader :duration
  
  def initialize(input_mp3)
    self.input_mp3 = input_mp3
    self.samples = []
    self.samples_c = 0
    
    readmp3(input_mp3) do |ss|
      self.samples += ss
      self.samples_c += ss.size
    end
    
    @duration = self.samples_c / SAMPLE_RATE.to_f
  end
  
  
  def draw_cairo(output_png)
    
    samples_per_pixel = samples_c / SURFACE_WIDTH
    midpoint = SURFACE_HEIGHT/2
  
    waveform_surface = Cairo::ImageSurface.new(Cairo::FORMAT_ARGB32,
                                               SURFACE_WIDTH + PADDING_X*2, 
                                               SURFACE_HEIGHT + PADDING_Y*2)


    waveform_context = Cairo::Context.new(waveform_surface)

    mtx = Cairo::Matrix.new(1,0,0,-1,0,midpoint)
    waveform_context.transform(mtx)
  
    waveform_context.set_line_width(0.75)
    waveform_context.set_source_rgba(0,0,0,1)
  
    plot = []
    max_sample = -10000000
    i = 0
  
    while 1
      acc = 0
      j = 0
      samples_per_pixel.times do
        s = samples[i*samples_per_pixel+j]
        s ||= 0
        acc += s < 0 ? s.abs : s*2
        j += 1
      end
      p = acc / samples_per_pixel
      i += 1
    
      y = (p * SURFACE_HEIGHT)/(2000*16)
    
      waveform_context.move_to(i+PADDING_X, y)
      waveform_context.line_to(i+PADDING_X, -y)
    
      break if i*samples_per_pixel >= samples_c
    end
  
  
    waveform_context.stroke
  
    waveform_context.set_line_width(1.0)
    waveform_context.set_source_rgba(1,0,0,0.6)
    waveform_context.move_to(0, 0)
    waveform_context.line_to(SURFACE_WIDTH+PADDING_X*2,0)
    waveform_context.stroke

  
    waveform_surface.write_to_png(output_png)
  
  end
  
  private 
  def readmp3(filename)
    IO.popen("madplay --downsample -d -A 0.5 -Q -R #{SAMPLE_RATE} --output=raw:- -m #{filename}") do |data|
      while s = data.read(1048576) do
        yield s.unpack('s*')
      end
    end
  end
end

