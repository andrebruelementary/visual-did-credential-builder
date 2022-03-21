package com.elementarysoftware.prism;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Vector;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

import com.elementarysoftware.io.FileOperations;

public class Batch {

	private String id;
	private String latestOperationHash;
	private Vector<Credential> credentials;
	private String infoFilePath;
	
	public Batch(String batchID, String latestOpHash) {
		id = batchID;
		latestOperationHash = latestOpHash;
		credentials = new Vector<Credential>();
		createBatchInfoFile(null);
	}
	
	public void addCredential(Credential c) {
		credentials.add(c);
	}

	public Credential[] getCredentials() {
		return credentials.toArray(Credential[]::new);
	}

	public String getId() {
		return id;
	}

	public String getLatestOperationHash() {
		return latestOperationHash;
	}

	public void setLatestOperationHash(String operationHash) {
		
		//TODO: Skrive denne slik at den lagrer i batch sin xml fil
		
		// Instantiate the Factory
				DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
				try {
					// optional, but recommended
					// process XML securely, avoid attacks like XML External Entities (XXE)
					dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);

					// parse XML file
					DocumentBuilder db = dbf.newDocumentBuilder();

					Document doc = db.parse(new File(getBatchInfoFile()));
					doc.getDocumentElement().normalize();

					Node xml_batch = doc.getElementsByTagName("batch").item(0);

					NamedNodeMap attr = xml_batch.getAttributes();
					Node oprHashAttr = attr.getNamedItem("latestOperationHash");

					if(oprHashAttr != null) {
						System.out.println("latestOperationHash before change: "+oprHashAttr.getTextContent());
						oprHashAttr.setTextContent(operationHash);
						System.out.println("latestOperationHash after change: "+oprHashAttr.getTextContent());
					}
					else {
						Element elem_did = (Element) xml_batch;
						elem_did.setAttribute("latestOperationHash", operationHash);
					}

					// write DOM document to a file
					try (FileOutputStream output =
							new FileOutputStream(getBatchInfoFile())) {
						FileOperations.writeXml(doc, output);
					} catch (IOException e) {
						e.printStackTrace();
					} catch (TransformerException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}

				}
				catch (SAXException saxe) {
					System.err.println("Error reading DID settings. "+ saxe.getMessage());
				}
				catch (ParserConfigurationException pce) {
					System.err.println("Error reading DIDs. "+ pce.getMessage());
				}
				catch (IOException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}

	}

	private String getBatchInfoFile() {
		return infoFilePath;
	}
	
	private void createBatchInfoFile(File directory) {
		//infoFilePath = 
		DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
		DocumentBuilder docBuilder;
		try {
			docBuilder = docFactory.newDocumentBuilder();
			
			Document doc = docBuilder.newDocument();
			Element rootElement = doc.createElement("batch");
			rootElement.setAttribute("id", id);
			doc.appendChild(rootElement);

			File batchMetadata = new File(directory, id+".xml");//File.createTempFile("did_", ".xml", directory);

			// write DOM document to a file
			try (FileOutputStream output =
					new FileOutputStream(batchMetadata.getAbsolutePath())) {
				FileOperations.writeXml(doc, output);
			} catch (IOException e) {
				e.printStackTrace();
			} catch (TransformerException e) {
				e.printStackTrace();
			}		
			
		} catch (ParserConfigurationException e1) {
			e1.printStackTrace();
		}
	
	}
	
}
