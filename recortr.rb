require 'rubygems'
require 'sinatra'
require 'grapher'
require 'md5'
require 'fileutils'

def clip_path(id)
  File.join(Sinatra.application.options.public, 'clips', id)
end

def audio_path(id)
  File.join clip_path(id), 'audio.mp3'
end

def audio_clip_path(id, start, duration)
  File.join(clip_path(id),
            "audio-#{'%.3f' % start.to_f}-#{'%.3f' % duration.to_f}.mp3")
end

def move_uploaded(path, id)
  FileUtils.mkdir_p(clip_path(id))
  FileUtils.move(path, audio_path(id))
end

def make_audio_clip(id, start, duration)
  
  def seconds_to_time(sec)
    s = '%.3f' % (sec.to_f % 60)
    s = '0' + s if s.to_f < 10
    "00:#{'%02d' % (sec.to_f / 60).to_i}:#{s}"
  end
  
  st = seconds_to_time start
  du = seconds_to_time duration
  
  cmd = "#{Sinatra.application.options.cmd_madplay || 'madplay'} -Q -m --start=#{st} --time=#{du} --output=wave:- #{audio_path(id)} | #{Sinatra.application.options.cmd_lame || 'lame'} --quiet -q 9 -b 128 - #{audio_clip_path(id, start, duration)}"
  
  system cmd
  
end
 
post '/' do
  @clip_id = MD5.hexdigest(Time.now.to_f.to_s)
  
  move_uploaded(params[:mp3_upload][:tempfile].path, @clip_id)

  @png_path = "/clips/#{@clip_id}/plot.png"
  @wg = WaveGrapher.new(audio_path(@clip_id))
  @wg.draw_cairo(File.join(clip_path(@clip_id), 'plot.png'))
  
  erb :post_upload
end

get '/clip/:id' do
  throw :halt, [401, 'No way'] if params[:id] !~ /^[abcdef0-9]{32}$/
  throw :halt, [401, 'Cannot be longer than 30s'] if params[:d].to_f > 31

  if not File.exist?(audio_clip_path(params[:id], params[:s], params[:d]))
    make_audio_clip(params[:id], params[:s], params[:d])
  end
  
  send_file audio_clip_path(params[:id], params[:s], params[:d]), :type => 'audio/mpeg', :disposition => 'attachment'
end

get '/' do
  erb :index
end
