require 'xcodeproj'

project_path = 'jink/jink.xcodeproj'
project = Xcodeproj::Project.open(project_path)

scan_group = project.main_group.find_subpath(File.join('JinkApp', 'Features', 'Scan'), false)
if scan_group
  file_ref = scan_group.files.find { |f| f.path == 'BuildingResultView.swift' || f.name == 'BuildingResultView.swift' }
  if file_ref
    file_ref.build_files.each { |bf| bf.remove_from_project }
    file_ref.remove_from_project
  end
end

project.save
